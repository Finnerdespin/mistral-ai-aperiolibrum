"""Main FastAPI application for AperioLibrum."""

from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .database import db, Book, BookCreate, User, UserCreate, Loan, LoanCreate, Reservation, ReservationCreate, Fine, FineCreate
from .auth import (
    get_current_active_user,
    get_librarian_user,
    get_password_hash,
    create_access_token,
    verify_password,
)
from .config import settings

app = FastAPI(
    title="AperioLibrum",
    description="A simple library management system API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Authentication endpoints
from fastapi import Form

@app.post("/token", response_model=dict)
async def login(username: str = Form(...), password: str = Form(...)):
    user = db.get_user_by_username(username)
    if not user or user.password != password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


# User endpoints
@app.post("/users/", response_model=User)
async def create_user(user: UserCreate):
    if db.get_user_by_username(user.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.get_user_by_email(user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        id=db.next_id["users"],
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        password=user.password,  # In production, store hashed password
        is_active=True,
        is_librarian=False,
        created_at=datetime.utcnow(),
    )
    db.users.append(new_user)
    db.next_id["users"] += 1
    return new_user


@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@app.get("/users/{user_id}", response_model=User)
async def read_user(user_id: int, current_user: User = Depends(get_librarian_user)):
    user = db.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/users/", response_model=List[User])
async def read_users(current_user: User = Depends(get_librarian_user)):
    return db.users


# Book endpoints
@app.post("/books/", response_model=Book)
async def create_book(book: BookCreate, current_user: User = Depends(get_librarian_user)):
    if db.get_book_by_isbn(book.isbn):
        raise HTTPException(status_code=400, detail="Book with this ISBN already exists")
    
    new_book = Book(
        id=db.next_id["books"],
        title=book.title,
        author=book.author,
        isbn=book.isbn,
        publisher=book.publisher,
        published_date=book.published_date,
        genre=book.genre,
        description=book.description,
        total_copies=book.total_copies,
        available_copies=book.available_copies,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.books.append(new_book)
    db.next_id["books"] += 1
    return new_book


@app.get("/books/{book_id}", response_model=Book)
async def read_book(book_id: int):
    book = db.get_book_by_id(book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@app.get("/books/", response_model=List[Book])
async def read_books(title: Optional[str] = None, author: Optional[str] = None):
    if title:
        return db.get_books_by_title(title)
    if author:
        return db.get_books_by_author(author)
    return db.books


@app.put("/books/{book_id}", response_model=Book)
async def update_book(book_id: int, book: BookCreate, current_user: User = Depends(get_librarian_user)):
    existing_book = db.get_book_by_id(book_id)
    if existing_book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    
    updated_book = Book(
        id=book_id,
        title=book.title,
        author=book.author,
        isbn=book.isbn,
        publisher=book.publisher,
        published_date=book.published_date,
        genre=book.genre,
        description=book.description,
        total_copies=book.total_copies,
        available_copies=book.available_copies,
        created_at=existing_book.created_at,
        updated_at=datetime.utcnow(),
    )
    
    index = db.books.index(existing_book)
    db.books[index] = updated_book
    return updated_book


@app.delete("/books/{book_id}", response_model=Book)
async def delete_book(book_id: int, current_user: User = Depends(get_librarian_user)):
    book = db.get_book_by_id(book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    
    db.books.remove(book)
    return book


# Loan endpoints
@app.post("/loans/", response_model=Loan)
async def create_loan(loan: LoanCreate, current_user: User = Depends(get_librarian_user)):
    book = db.get_book_by_id(loan.book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book.available_copies <= 0:
        raise HTTPException(status_code=400, detail="No available copies of this book")
    
    user = db.get_user_by_id(loan.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user already has this book on loan
    for existing_loan in db.loans:
        if existing_loan.user_id == loan.user_id and existing_loan.book_id == loan.book_id and existing_loan.status == "active":
            raise HTTPException(status_code=400, detail="User already has this book on loan")
    
    new_loan = Loan(
        id=db.next_id["loans"],
        book_id=loan.book_id,
        user_id=loan.user_id,
        due_date=loan.due_date,
        loan_date=datetime.utcnow(),
        return_date=None,
        status="active",
    )
    db.loans.append(new_loan)
    db.next_id["loans"] += 1
    
    # Update book availability
    book.available_copies -= 1
    index = db.books.index(book)
    db.books[index] = book
    
    return new_loan


@app.get("/loans/{loan_id}", response_model=Loan)
async def read_loan(loan_id: int, current_user: User = Depends(get_current_active_user)):
    loan = db.get_loan_by_id(loan_id)
    if loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    # Users can only see their own loans unless they're librarians
    if not current_user.is_librarian and loan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this loan")
    
    return loan


@app.get("/loans/", response_model=List[Loan])
async def read_loans(current_user: User = Depends(get_current_active_user)):
    if current_user.is_librarian:
        return db.loans
    return db.get_loans_by_user(current_user.id)


@app.put("/loans/{loan_id}/return", response_model=Loan)
async def return_loan(loan_id: int, current_user: User = Depends(get_librarian_user)):
    loan = db.get_loan_by_id(loan_id)
    if loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    if loan.status != "active":
        raise HTTPException(status_code=400, detail="Loan is not active")
    
    loan.return_date = datetime.utcnow()
    loan.status = "returned"
    
    # Update book availability
    book = db.get_book_by_id(loan.book_id)
    if book:
        book.available_copies += 1
        index = db.books.index(book)
        db.books[index] = book
    
    return loan


# Reservation endpoints
@app.post("/reservations/", response_model=Reservation)
async def create_reservation(reservation: ReservationCreate, current_user: User = Depends(get_current_active_user)):
    book = db.get_book_by_id(reservation.book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book.available_copies > 0:
        raise HTTPException(status_code=400, detail="Book is available for loan")
    
    # Check if user already has a reservation for this book
    for existing_reservation in db.reservations:
        if existing_reservation.user_id == reservation.user_id and existing_reservation.book_id == reservation.book_id and existing_reservation.status == "pending":
            raise HTTPException(status_code=400, detail="User already has a reservation for this book")
    
    new_reservation = Reservation(
        id=db.next_id["reservations"],
        book_id=reservation.book_id,
        user_id=reservation.user_id,
        reservation_date=datetime.utcnow(),
        status="pending",
    )
    db.reservations.append(new_reservation)
    db.next_id["reservations"] += 1
    
    return new_reservation


@app.get("/reservations/{reservation_id}", response_model=Reservation)
async def read_reservation(reservation_id: int, current_user: User = Depends(get_current_active_user)):
    reservation = db.get_reservation_by_id(reservation_id)
    if reservation is None:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Users can only see their own reservations unless they're librarians
    if not current_user.is_librarian and reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this reservation")
    
    return reservation


@app.get("/reservations/", response_model=List[Reservation])
async def read_reservations(current_user: User = Depends(get_current_active_user)):
    if current_user.is_librarian:
        return db.reservations
    return db.get_reservations_by_user(current_user.id)


@app.put("/reservations/{reservation_id}/fulfill", response_model=Reservation)
async def fulfill_reservation(reservation_id: int, current_user: User = Depends(get_librarian_user)):
    reservation = db.get_reservation_by_id(reservation_id)
    if reservation is None:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if reservation.status != "pending":
        raise HTTPException(status_code=400, detail="Reservation is not pending")
    
    reservation.status = "fulfilled"
    return reservation


@app.delete("/reservations/{reservation_id}", response_model=Reservation)
async def delete_reservation(reservation_id: int, current_user: User = Depends(get_current_active_user)):
    reservation = db.get_reservation_by_id(reservation_id)
    if reservation is None:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    # Users can only delete their own reservations unless they're librarians
    if not current_user.is_librarian and reservation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this reservation")
    
    db.reservations.remove(reservation)
    return reservation


# Fine endpoints
@app.post("/fines/", response_model=Fine)
async def create_fine(fine: FineCreate, current_user: User = Depends(get_librarian_user)):
    loan = db.get_loan_by_id(fine.loan_id)
    if loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    new_fine = Fine(
        id=db.next_id["fines"],
        loan_id=fine.loan_id,
        user_id=fine.user_id,
        amount=fine.amount,
        reason=fine.reason,
        issued_date=datetime.utcnow(),
        paid_date=None,
        status="unpaid",
    )
    db.fines.append(new_fine)
    db.next_id["fines"] += 1
    
    return new_fine


@app.get("/fines/{fine_id}", response_model=Fine)
async def read_fine(fine_id: int, current_user: User = Depends(get_current_active_user)):
    fine = db.get_fine_by_id(fine_id)
    if fine is None:
        raise HTTPException(status_code=404, detail="Fine not found")
    
    # Users can only see their own fines unless they're librarians
    if not current_user.is_librarian and fine.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this fine")
    
    return fine


@app.get("/fines/", response_model=List[Fine])
async def read_fines(current_user: User = Depends(get_current_active_user)):
    if current_user.is_librarian:
        return db.fines
    return db.get_fines_by_user(current_user.id)


@app.put("/fines/{fine_id}/pay", response_model=Fine)
async def pay_fine(fine_id: int, current_user: User = Depends(get_librarian_user)):
    fine = db.get_fine_by_id(fine_id)
    if fine is None:
        raise HTTPException(status_code=404, detail="Fine not found")
    
    if fine.status != "unpaid":
        raise HTTPException(status_code=400, detail="Fine is already paid")
    
    fine.paid_date = datetime.utcnow()
    fine.status = "paid"
    
    return fine


# Health check
@app.get("/")
async def root():
    return {"message": "Welcome to AperioLibrum API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
