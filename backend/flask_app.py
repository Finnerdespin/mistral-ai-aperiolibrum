"""AperioLibrum - Flask Application with all routes serving HTML pages."""

from flask import Flask, render_template, request, redirect, url_for, jsonify, session, abort
from datetime import datetime, date, timedelta
from functools import wraps
import secrets

app = Flask(__name__, static_folder='../static', template_folder='../templates')
app.secret_key = secrets.token_hex(32)

# In-memory database
books = []
users = []
loans = []
reservations = []
fines = []
next_id = {"users": 1, "books": 1, "loans": 1, "reservations": 1, "fines": 1}


def get_user_by_id(user_id):
    return next((u for u in users if u['id'] == user_id), None)


def get_user_by_username(username):
    return next((u for u in users if u['username'] == username), None)


def get_user_by_email(email):
    return next((u for u in users if u['email'] == email), None)


def get_book_by_id(book_id):
    return next((b for b in books if b['id'] == book_id), None)


def get_book_by_isbn(isbn):
    return next((b for b in books if b['isbn'] == isbn), None)


def get_books_by_title(title):
    return [b for b in books if title.lower() in b['title'].lower()]


def get_books_by_author(author):
    return [b for b in books if author.lower() in b['author'].lower()]


def get_loan_by_id(loan_id):
    return next((l for l in loans if l['id'] == loan_id), None)


def get_loans_by_user(user_id):
    return [l for l in loans if l['user_id'] == user_id]


def get_reservation_by_id(reservation_id):
    return next((r for r in reservations if r['id'] == reservation_id), None)


def get_reservations_by_user(user_id):
    return [r for r in reservations if r['user_id'] == user_id]


def get_fine_by_id(fine_id):
    return next((f for f in fines if f['id'] == fine_id), None)


def get_fines_by_user(user_id):
    return [f for f in fines if f['user_id'] == user_id]


# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function


def librarian_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login_page'))
        user = get_user_by_id(session['user_id'])
        if not user or not user.get('is_librarian', False):
            abort(403)
        return f(*args, **kwargs)
    return decorated_function


# HTML Routes
@app.route('/')
def index():
    total_books = len(books)
    available_books = sum(b['available_copies'] for b in books)
    active_loans = len([l for l in loans if l['status'] == 'active'])
    pending_reservations = len([r for r in reservations if r['status'] == 'pending'])
    user = get_user_by_id(session.get('user_id')) if 'user_id' in session else None
    return render_template('index.html', 
                         total_books=total_books,
                         available_books=available_books,
                         active_loans=active_loans,
                         pending_reservations=pending_reservations,
                         user=user)


@app.route('/login')
def login_page():
    return render_template('login.html')


@app.route('/register')
def register_page():
    return render_template('register.html')


@app.route('/books')
def books_page():
    user = get_user_by_id(session.get('user_id')) if 'user_id' in session else None
    return render_template('books.html', books=books, user=user)


@app.route('/loans')
@login_required
def loans_page():
    user = get_user_by_id(session['user_id'])
    if user and user.get('is_librarian', False):
        loans_list = loans
    else:
        loans_list = get_loans_by_user(user['id'])
    
    return render_template('loans.html', loans=loans_list, books=books, users=users, user=user)


@app.route('/reservations')
@login_required
def reservations_page():
    user = get_user_by_id(session['user_id'])
    if user and user.get('is_librarian', False):
        reservations_list = reservations
    else:
        reservations_list = get_reservations_by_user(user['id'])
    
    return render_template('reservations.html', reservations=reservations_list, books=books, user=user)


@app.route('/profile')
@login_required
def profile_page():
    user = get_user_by_id(session['user_id'])
    fines_list = get_fines_by_user(user['id'])
    return render_template('profile.html', user=user, fines=fines_list, books=books)


# API Routes for authentication
@app.route('/api/login', methods=['POST'])
def api_login():
    username = request.form.get('username')
    password = request.form.get('password')
    user = get_user_by_username(username)
    if user and user['password'] == password:
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['is_librarian'] = user.get('is_librarian', False)
        return jsonify({'success': True, 'message': 'Login successful'})
    return jsonify({'success': False, 'message': 'Invalid username or password'}), 401


@app.route('/api/logout')
def api_logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out'})


@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    full_name = data.get('full_name')
    password = data.get('password')
    
    if get_user_by_username(username):
        return jsonify({'success': False, 'message': 'Username already exists'}), 400
    if get_user_by_email(email):
        return jsonify({'success': False, 'message': 'Email already exists'}), 400
    
    new_user = {
        'id': next_id['users'],
        'username': username,
        'email': email,
        'full_name': full_name,
        'password': password,
        'is_active': True,
        'is_librarian': False,
        'created_at': datetime.utcnow().isoformat()
    }
    users.append(new_user)
    next_id['users'] += 1
    return jsonify({'success': True, 'user': new_user})


# API Routes for users
@app.route('/api/users', methods=['GET'])
@librarian_required
def get_users():
    return jsonify(users)


@app.route('/api/users/me', methods=['GET'])
@login_required
def get_current_user():
    user = get_user_by_id(session['user_id'])
    if user:
        return jsonify(user)
    return jsonify({'error': 'User not found'}), 404


# API Routes for books
@app.route('/api/books', methods=['GET'])
def get_books():
    title = request.args.get('title')
    author = request.args.get('author')
    
    if title:
        result = get_books_by_title(title)
    elif author:
        result = get_books_by_author(author)
    else:
        result = books
    return jsonify(result)


@app.route('/api/books', methods=['POST'])
@librarian_required
def create_book():
    data = request.get_json()
    isbn = data.get('isbn')
    if get_book_by_isbn(isbn):
        return jsonify({'error': 'Book with this ISBN already exists'}), 400
    
    new_book = {
        'id': next_id['books'],
        'title': data.get('title'),
        'author': data.get('author'),
        'isbn': isbn,
        'publisher': data.get('publisher'),
        'published_date': data.get('published_date'),
        'genre': data.get('genre'),
        'description': data.get('description'),
        'total_copies': data.get('total_copies', 1),
        'available_copies': data.get('available_copies', 1),
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }
    books.append(new_book)
    next_id['books'] += 1
    return jsonify(new_book), 201


@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    book = get_book_by_id(book_id)
    if book:
        return jsonify(book)
    return jsonify({'error': 'Book not found'}), 404


@app.route('/api/books/<int:book_id>', methods=['PUT'])
@librarian_required
def update_book(book_id):
    book = get_book_by_id(book_id)
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    data = request.get_json()
    book.update({
        'title': data.get('title', book['title']),
        'author': data.get('author', book['author']),
        'isbn': data.get('isbn', book['isbn']),
        'publisher': data.get('publisher', book['publisher']),
        'published_date': data.get('published_date', book['published_date']),
        'genre': data.get('genre', book['genre']),
        'description': data.get('description', book['description']),
        'total_copies': data.get('total_copies', book['total_copies']),
        'available_copies': data.get('available_copies', book['available_copies']),
        'updated_at': datetime.utcnow().isoformat()
    })
    return jsonify(book)


@app.route('/api/books/<int:book_id>', methods=['DELETE'])
@librarian_required
def delete_book(book_id):
    book = get_book_by_id(book_id)
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    books.remove(book)
    return jsonify(book)


# API Routes for loans
@app.route('/api/loans', methods=['GET'])
@login_required
def get_loans():
    user = get_user_by_id(session['user_id'])
    if user and user.get('is_librarian', False):
        result = loans
    else:
        result = get_loans_by_user(user['id'])
    return jsonify(result)


@app.route('/api/loans', methods=['POST'])
@librarian_required
def create_loan():
    data = request.get_json()
    book_id = data.get('book_id')
    user_id = data.get('user_id')
    due_date = data.get('due_date')
    
    book = get_book_by_id(book_id)
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    if book['available_copies'] <= 0:
        return jsonify({'error': 'No available copies'}), 400
    
    user = get_user_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    new_loan = {
        'id': next_id['loans'],
        'book_id': book_id,
        'user_id': user_id,
        'due_date': due_date,
        'loan_date': datetime.utcnow().isoformat(),
        'return_date': None,
        'status': 'active'
    }
    loans.append(new_loan)
    next_id['loans'] += 1
    book['available_copies'] -= 1
    return jsonify(new_loan), 201


@app.route('/api/loans/<int:loan_id>/return', methods=['PUT'])
@librarian_required
def return_loan(loan_id):
    loan = get_loan_by_id(loan_id)
    if not loan:
        return jsonify({'error': 'Loan not found'}), 404
    if loan['status'] != 'active':
        return jsonify({'error': 'Loan is not active'}), 400
    
    loan['return_date'] = datetime.utcnow().isoformat()
    loan['status'] = 'returned'
    
    book = get_book_by_id(loan['book_id'])
    if book:
        book['available_copies'] += 1
    
    return jsonify(loan)


# API Routes for reservations
@app.route('/api/reservations', methods=['GET'])
@login_required
def get_reservations():
    user = get_user_by_id(session['user_id'])
    if user and user.get('is_librarian', False):
        result = reservations
    else:
        result = get_reservations_by_user(user['id'])
    return jsonify(result)


@app.route('/api/reservations', methods=['POST'])
@login_required
def create_reservation():
    data = request.get_json()
    book_id = data.get('book_id')
    user_id = data.get('user_id', session['user_id'])
    
    book = get_book_by_id(book_id)
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    if book['available_copies'] > 0:
        return jsonify({'error': 'Book is available for loan'}), 400
    
    new_reservation = {
        'id': next_id['reservations'],
        'book_id': book_id,
        'user_id': user_id,
        'reservation_date': datetime.utcnow().isoformat(),
        'status': 'pending'
    }
    reservations.append(new_reservation)
    next_id['reservations'] += 1
    return jsonify(new_reservation), 201


@app.route('/api/reservations/<int:reservation_id>', methods=['DELETE'])
@login_required
def delete_reservation(reservation_id):
    reservation = get_reservation_by_id(reservation_id)
    if not reservation:
        return jsonify({'error': 'Reservation not found'}), 404
    
    user = get_user_by_id(session['user_id'])
    if not user.get('is_librarian', False) and reservation['user_id'] != user['id']:
        return jsonify({'error': 'Not authorized'}), 403
    
    reservations.remove(reservation)
    return jsonify(reservation)


# API Routes for fines
@app.route('/api/fines', methods=['GET'])
@login_required
def get_fines():
    user = get_user_by_id(session['user_id'])
    if user and user.get('is_librarian', False):
        result = fines
    else:
        result = get_fines_by_user(user['id'])
    return jsonify(result)


@app.route('/api/fines', methods=['POST'])
@librarian_required
def create_fine():
    data = request.get_json()
    new_fine = {
        'id': next_id['fines'],
        'loan_id': data.get('loan_id'),
        'user_id': data.get('user_id'),
        'amount': data.get('amount'),
        'reason': data.get('reason'),
        'issued_date': datetime.utcnow().isoformat(),
        'paid_date': None,
        'status': 'unpaid'
    }
    fines.append(new_fine)
    next_id['fines'] += 1
    return jsonify(new_fine), 201


@app.route('/api/fines/<int:fine_id>/pay', methods=['PUT'])
@librarian_required
def pay_fine(fine_id):
    fine = get_fine_by_id(fine_id)
    if not fine:
        return jsonify({'error': 'Fine not found'}), 404
    if fine['status'] != 'unpaid':
        return jsonify({'error': 'Fine is already paid'}), 400
    
    fine['paid_date'] = datetime.utcnow().isoformat()
    fine['status'] = 'paid'
    return jsonify(fine)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
