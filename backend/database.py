"""Database models and connection for AperioLibrum."""

from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    password: str
    is_active: bool = True
    is_librarian: bool = False
    created_at: datetime


class BookBase(BaseModel):
    title: str
    author: str
    isbn: str = Field(..., min_length=10, max_length=13)
    publisher: Optional[str] = None
    published_date: Optional[date] = None
    genre: Optional[str] = None
    description: Optional[str] = None
    total_copies: int = 1
    available_copies: int = 1


class BookCreate(BookBase):
    pass


class Book(BookBase):
    id: int
    created_at: datetime
    updated_at: datetime


class LoanBase(BaseModel):
    book_id: int
    user_id: int
    due_date: date


class LoanCreate(LoanBase):
    pass


class Loan(LoanBase):
    id: int
    loan_date: datetime
    return_date: Optional[datetime] = None
    status: str = "active"


class ReservationBase(BaseModel):
    book_id: int
    user_id: int


class ReservationCreate(ReservationBase):
    pass


class Reservation(ReservationBase):
    id: int
    reservation_date: datetime
    status: str = "pending"


class FineBase(BaseModel):
    loan_id: int
    user_id: int
    amount: float
    reason: str


class FineCreate(FineBase):
    pass


class Fine(FineBase):
    id: int
    issued_date: datetime
    paid_date: Optional[datetime] = None
    status: str = "unpaid"


# In-memory database for demo purposes
class InMemoryDatabase:
    def __init__(self):
        self.users: List[User] = []
        self.books: List[Book] = []
        self.loans: List[Loan] = []
        self.reservations: List[Reservation] = []
        self.fines: List[Fine] = []
        self.next_id: dict = {
            "users": 1,
            "books": 1,
            "loans": 1,
            "reservations": 1,
            "fines": 1
        }

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        for user in self.users:
            if user.id == user_id:
                return user
        return None

    def get_user_by_username(self, username: str) -> Optional[User]:
        for user in self.users:
            if user.username == username:
                return user
        return None

    def get_user_by_email(self, email: str) -> Optional[User]:
        for user in self.users:
            if user.email == email:
                return user
        return None

    def get_book_by_id(self, book_id: int) -> Optional[Book]:
        for book in self.books:
            if book.id == book_id:
                return book
        return None

    def get_book_by_isbn(self, isbn: str) -> Optional[Book]:
        for book in self.books:
            if book.isbn == isbn:
                return book
        return None

    def get_books_by_title(self, title: str) -> List[Book]:
        return [book for book in self.books if title.lower() in book.title.lower()]

    def get_books_by_author(self, author: str) -> List[Book]:
        return [book for book in self.books if author.lower() in book.author.lower()]

    def get_loan_by_id(self, loan_id: int) -> Optional[Loan]:
        for loan in self.loans:
            if loan.id == loan_id:
                return loan
        return None

    def get_loans_by_user(self, user_id: int) -> List[Loan]:
        return [loan for loan in self.loans if loan.user_id == user_id]

    def get_reservation_by_id(self, reservation_id: int) -> Optional[Reservation]:
        for reservation in self.reservations:
            if reservation.id == reservation_id:
                return reservation
        return None

    def get_reservations_by_user(self, user_id: int) -> List[Reservation]:
        return [reservation for reservation in self.reservations if reservation.user_id == user_id]

    def get_reservations_by_book(self, book_id: int) -> List[Reservation]:
        return [reservation for reservation in self.reservations if reservation.book_id == book_id]

    def get_fine_by_id(self, fine_id: int) -> Optional[Fine]:
        for fine in self.fines:
            if fine.id == fine_id:
                return fine
        return None

    def get_fines_by_user(self, user_id: int) -> List[Fine]:
        return [fine for fine in self.fines if fine.user_id == user_id]


db = InMemoryDatabase()
