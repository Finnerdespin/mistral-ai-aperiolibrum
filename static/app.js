// AperioLibrum - Frontend JavaScript

const API_BASE = 'http://localhost:8000';

// Global state
let currentUser = null;
let books = [];
let users = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadUserFromStorage();
    initializeRoutes();
    initializeModals();
});

// User authentication
function loadUserFromStorage() {
    const user = localStorage.getItem('aperiolibrum_user');
    const token = localStorage.getItem('aperiolibrum_token');
    
    if (user && token) {
        currentUser = JSON.parse(user);
        updateNavigation();
    }
}

function updateNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    
    // Hide/show links based on auth status
    const loginLink = document.querySelector('.nav-links a[href="login.html"]');
    const registerLink = document.querySelector('.nav-links a[href="register.html"]');
    const profileLink = document.querySelector('.nav-links a[href="profile.html"]');
    
    if (currentUser) {
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
        if (profileLink) profileLink.style.display = 'inline-block';
    } else {
        if (loginLink) loginLink.style.display = 'inline-block';
        if (registerLink) registerLink.style.display = 'inline-block';
        if (profileLink) profileLink.style.display = 'none';
    }
}

// Login form
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'login-form') {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${API_BASE}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Store token
                localStorage.setItem('aperiolibrum_token', data.access_token);
                
                // Get user info
                const userResponse = await fetch(`${API_BASE}/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${data.access_token}`
                    }
                });
                
                if (userResponse.ok) {
                    currentUser = await userResponse.json();
                    localStorage.setItem('aperiolibrum_user', JSON.stringify(currentUser));
                    
                    showAlert('login-alert', 'Login successful! Redirecting...', 'success');
                    updateNavigation();
                    
                    // Redirect to home page
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                }
            } else {
                showAlert('login-alert', 'Invalid username or password', 'error');
            }
        } catch (error) {
            showAlert('login-alert', 'Login failed. Please try again.', 'error');
        }
    }
});

// Register form
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'register-form') {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const full_name = document.getElementById('full_name').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${API_BASE}/users/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    email,
                    full_name,
                    password
                })
            });
            
            if (response.ok) {
                showAlert('register-alert', 'Registration successful! Please login.', 'success');
                
                // Clear form
                e.target.reset();
                
                // Redirect to login
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                const error = await response.json();
                showAlert('register-alert', error.detail || 'Registration failed', 'error');
            }
        } catch (error) {
            showAlert('register-alert', 'Registration failed. Please try again.', 'error');
        }
    }
});

// Logout function
function logout() {
    localStorage.removeItem('aperiolibrum_user');
    localStorage.removeItem('aperiolibrum_token');
    currentUser = null;
    updateNavigation();
    window.location.href = 'index.html';
}

// Book operations
async function loadBooks() {
    try {
        const response = await fetch(`${API_BASE}/books/`);
        if (response.ok) {
            books = await response.json();
            return books;
        }
    } catch (error) {
        console.error('Error loading books:', error);
    }
    return [];
}

async function loadFeaturedBooks() {
    const books = await loadBooks();
    const featuredBooksContainer = document.getElementById('featured-books');
    
    if (featuredBooksContainer) {
        if (books.length === 0) {
            featuredBooksContainer.innerHTML = '<p>No books available</p>';
            return;
        }
        
        // Show first 4 books
        const featured = books.slice(0, 4);
        featuredBooksContainer.innerHTML = '';
        
        featured.forEach(book => {
            const bookCard = createBookCard(book);
            featuredBooksContainer.appendChild(bookCard);
        });
    }
}

function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    const initials = book.title.substring(0, 2).toUpperCase();
    const availabilityClass = book.available_copies > 0 ? 'book-available' : 'book-unavailable';
    const availabilityText = book.available_copies > 0 ? 'Available' : 'Not Available';
    
    card.innerHTML = `
        <div class="book-cover">${initials}</div>
        <div class="book-info">
            <h3>${book.title}</h3>
            <p><strong>Author:</strong> ${book.author}</p>
            <p><strong>ISBN:</strong> ${book.isbn}</p>
            <span class="book-availability ${availabilityClass}">${availabilityText}</span>
        </div>
    `;
    
    return card;
}

async function loadAllBooks() {
    const books = await loadBooks();
    const booksGrid = document.getElementById('books-grid');
    
    if (booksGrid) {
        if (books.length === 0) {
            booksGrid.innerHTML = '<p>No books available</p>';
            return;
        }
        
        booksGrid.innerHTML = '';
        
        books.forEach(book => {
            const bookCard = createBookCard(book);
            booksGrid.appendChild(bookCard);
        });
    }
}

// Loan operations
async function loadLoans() {
    if (!currentUser) {
        showAlert('loans-alert', 'Please login to view your loans', 'error');
        return [];
    }
    
    try {
        const token = localStorage.getItem('aperiolibrum_token');
        const response = await fetch(`${API_BASE}/loans/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error loading loans:', error);
    }
    return [];
}

async function displayLoans() {
    const loans = await loadLoans();
    const loansTable = document.getElementById('loans-table');
    
    if (loansTable) {
        if (loans.length === 0) {
            loansTable.innerHTML = '<tr><td colspan="6" style="text-align: center;">No loans found</td></tr>';
            return;
        }
        
        loansTable.innerHTML = '';
        
        for (const loan of loans) {
            const book = books.find(b => b.id === loan.book_id);
            const dueDate = new Date(loan.due_date).toLocaleDateString();
            const loanDate = new Date(loan.loan_date).toLocaleDateString();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${book ? book.title : 'Unknown'}</td>
                <td>${book ? book.author : '-'}</td>
                <td>${loanDate}</td>
                <td>${dueDate}</td>
                <td><span class="badge badge-info">${loan.status}</span></td>
                <td class="table-actions">
                    ${loan.status === 'active' ? `<a href="#" class="btn btn-success" onclick="returnBook(${loan.id})">Return</a>` : ''}
                </td>
            `;
            loansTable.appendChild(row);
        }
    }
}

async function returnBook(loanId) {
    if (!confirm('Are you sure you want to return this book?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('aperiolibrum_token');
        const response = await fetch(`${API_BASE}/loans/${loanId}/return`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showAlert('loans-alert', 'Book returned successfully!', 'success');
            displayLoans();
        } else {
            showAlert('loans-alert', 'Failed to return book', 'error');
        }
    } catch (error) {
        showAlert('loans-alert', 'Error returning book', 'error');
    }
}

// Reservation operations
async function loadReservations() {
    if (!currentUser) {
        showAlert('reservations-alert', 'Please login to view your reservations', 'error');
        return [];
    }
    
    try {
        const token = localStorage.getItem('aperiolibrum_token');
        const response = await fetch(`${API_BASE}/reservations/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error loading reservations:', error);
    }
    return [];
}

async function displayReservations() {
    const reservations = await loadReservations();
    const reservationsTable = document.getElementById('reservations-table');
    
    if (reservationsTable) {
        if (reservations.length === 0) {
            reservationsTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">No reservations found</td></tr>';
            return;
        }
        
        reservationsTable.innerHTML = '';
        
        for (const reservation of reservations) {
            const book = books.find(b => b.id === reservation.book_id);
            const reservationDate = new Date(reservation.reservation_date).toLocaleDateString();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${book ? book.title : 'Unknown'}</td>
                <td>${book ? book.author : '-'}</td>
                <td>${reservationDate}</td>
                <td><span class="badge badge-warning">${reservation.status}</span></td>
                <td class="table-actions">
                    ${reservation.status === 'pending' ? `<a href="#" class="btn btn-danger" onclick="cancelReservation(${reservation.id})">Cancel</a>` : ''}
                </td>
            `;
            reservationsTable.appendChild(row);
        }
    }
}

async function cancelReservation(reservationId) {
    if (!confirm('Are you sure you want to cancel this reservation?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('aperiolibrum_token');
        const response = await fetch(`${API_BASE}/reservations/${reservationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showAlert('reservations-alert', 'Reservation cancelled successfully!', 'success');
            displayReservations();
        } else {
            showAlert('reservations-alert', 'Failed to cancel reservation', 'error');
        }
    } catch (error) {
        showAlert('reservations-alert', 'Error cancelling reservation', 'error');
    }
}

// Profile operations
async function loadProfile() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const token = localStorage.getItem('aperiolibrum_token');
        const response = await fetch(`${API_BASE}/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            localStorage.setItem('aperiolibrum_user', JSON.stringify(currentUser));
            displayProfile();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function displayProfile() {
    if (!currentUser) return;
    
    // Update user info
    const avatar = document.getElementById('user-avatar');
    const fullname = document.getElementById('user-fullname');
    const email = document.getElementById('user-email');
    const username = document.getElementById('user-username');
    
    if (avatar) {
        avatar.textContent = currentUser.full_name ? currentUser.full_name.substring(0, 1).toUpperCase() : 'U';
    }
    if (fullname) {
        fullname.textContent = currentUser.full_name || 'Not provided';
    }
    if (email) {
        email.textContent = currentUser.email || 'Not provided';
    }
    if (username) {
        username.textContent = currentUser.username || 'Not provided';
    }
    
    // Update form
    const profileUsername = document.getElementById('profile-username');
    const profileEmail = document.getElementById('profile-email');
    const profileFullname = document.getElementById('profile-fullname');
    
    if (profileUsername) profileUsername.value = currentUser.username || '';
    if (profileEmail) profileEmail.value = currentUser.email || '';
    if (profileFullname) profileFullname.value = currentUser.full_name || '';
}

async function updateProfile() {
    const fullname = document.getElementById('profile-fullname').value;
    
    try {
        const token = localStorage.getItem('aperiolibrum_token');
        const response = await fetch(`${API_BASE}/users/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                full_name: fullname
            })
        });
        
        if (response.ok) {
            currentUser.full_name = fullname;
            localStorage.setItem('aperiolibrum_user', JSON.stringify(currentUser));
            showAlert('profile-alert', 'Profile updated successfully!', 'success');
            displayProfile();
        } else {
            showAlert('profile-alert', 'Failed to update profile', 'error');
        }
    } catch (error) {
        showAlert('profile-alert', 'Error updating profile', 'error');
    }
}

// Fines operations
async function loadFines() {
    if (!currentUser) {
        return [];
    }
    
    try {
        const token = localStorage.getItem('aperiolibrum_token');
        const response = await fetch(`${API_BASE}/fines/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error loading fines:', error);
    }
    return [];
}

async function displayFines() {
    const fines = await loadFines();
    const finesTable = document.getElementById('fines-table');
    
    if (finesTable) {
        if (fines.length === 0) {
            finesTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">No fines found</td></tr>';
            return;
        }
        
        finesTable.innerHTML = '';
        
        for (const fine of fines) {
            const book = books.find(b => b.id === fine.loan_id);
            const issuedDate = new Date(fine.issued_date).toLocaleDateString();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${book ? book.title : 'Unknown'}</td>
                <td>$${fine.amount.toFixed(2)}</td>
                <td>${fine.reason}</td>
                <td>${issuedDate}</td>
                <td><span class="badge badge-${fine.status === 'paid' ? 'success' : 'danger'}">${fine.status}</span></td>
            `;
            finesTable.appendChild(row);
        }
    }
}

// Dashboard stats
async function loadDashboardStats() {
    const books = await loadBooks();
    
    // Update stats
    const totalBooks = document.getElementById('total-books');
    const availableBooks = document.getElementById('available-books');
    
    if (totalBooks) {
        totalBooks.textContent = books.length;
    }
    
    if (availableBooks) {
        const available = books.reduce((sum, book) => sum + book.available_copies, 0);
        availableBooks.textContent = available;
    }
    
    // Load featured books
    await loadFeaturedBooks();
}

// Utility functions
function showAlert(elementId, message, type = 'info') {
    const alert = document.getElementById(elementId);
    if (!alert) return;
    
    alert.textContent = message;
    alert.className = `alert alert-${type}`;
    alert.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

function initializeRoutes() {
    const path = window.location.pathname.split('/').pop();
    
    switch (path) {
        case 'index.html':
        case '':
            loadDashboardStats();
            break;
        case 'books.html':
            loadAllBooks();
            break;
        case 'loans.html':
            loadBooks().then(loadAllBooks).then(displayLoans);
            break;
        case 'reservations.html':
            loadBooks().then(loadAllBooks).then(displayReservations);
            break;
        case 'profile.html':
            loadBooks().then(loadAllBooks).then(loadProfile).then(displayFines);
            break;
    }
}

function initializeModals() {
    // Book modal
    const bookModal = document.getElementById('book-modal');
    const addBookBtn = document.getElementById('add-book-btn');
    const closeBookModal = document.getElementById('close-book-modal');
    const cancelBookBtn = document.getElementById('cancel-book-btn');
    const saveBookBtn = document.getElementById('save-book-btn');
    
    if (addBookBtn && bookModal) {
        addBookBtn.addEventListener('click', () => {
            document.getElementById('book-modal-title').textContent = 'Add Book';
            document.getElementById('book-id').value = '';
            document.getElementById('book-title').value = '';
            document.getElementById('book-author').value = '';
            document.getElementById('book-isbn').value = '';
            document.getElementById('book-publisher').value = '';
            document.getElementById('book-published-date').value = '';
            document.getElementById('book-genre').value = '';
            document.getElementById('book-description').value = '';
            document.getElementById('book-total-copies').value = '1';
            bookModal.style.display = 'block';
        });
    }
    
    if (closeBookModal && bookModal) {
        closeBookModal.addEventListener('click', () => {
            bookModal.style.display = 'none';
        });
    }
    
    if (cancelBookBtn && bookModal) {
        cancelBookBtn.addEventListener('click', () => {
            bookModal.style.display = 'none';
        });
    }
    
    if (saveBookBtn) {
        saveBookBtn.addEventListener('click', async () => {
            const id = document.getElementById('book-id').value;
            const title = document.getElementById('book-title').value;
            const author = document.getElementById('book-author').value;
            const isbn = document.getElementById('book-isbn').value;
            const publisher = document.getElementById('book-publisher').value;
            const publishedDate = document.getElementById('book-published-date').value;
            const genre = document.getElementById('book-genre').value;
            const description = document.getElementById('book-description').value;
            const totalCopies = parseInt(document.getElementById('book-total-copies').value) || 1;
            
            try {
                const token = localStorage.getItem('aperiolibrum_token');
                const method = id ? 'PUT' : 'POST';
                const url = id ? `${API_BASE}/books/${id}` : `${API_BASE}/books/`;
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify({
                        title,
                        author,
                        isbn,
                        publisher,
                        published_date: publishedDate,
                        genre,
                        description,
                        total_copies: totalCopies,
                        available_copies: totalCopies
                    })
                });
                
                if (response.ok) {
                    showAlert('book-alert', `Book ${id ? 'updated' : 'added'} successfully!`, 'success');
                    document.getElementById('book-modal').style.display = 'none';
                    loadAllBooks();
                } else {
                    const error = await response.json();
                    showAlert('book-alert', error.detail || 'Failed to save book', 'error');
                }
            } catch (error) {
                showAlert('book-alert', 'Error saving book', 'error');
            }
        });
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Loan modal
const loanModal = document.getElementById('loan-modal');
const newLoanBtn = document.getElementById('new-loan-btn');
const closeLoanModal = document.getElementById('close-loan-modal');
const cancelLoanBtn = document.getElementById('cancel-loan-btn');
const createLoanBtn = document.getElementById('create-loan-btn');

if (newLoanBtn && loanModal) {
    newLoanBtn.addEventListener('click', async () => {
        // Load available books
        const books = await loadBooks();
        const loanBookSelect = document.getElementById('loan-book');
        
        if (loanBookSelect) {
            loanBookSelect.innerHTML = '<option value="">Select a book</option>';
            books.forEach(book => {
                if (book.available_copies > 0) {
                    const option = document.createElement('option');
                    option.value = book.id;
                    option.textContent = `${book.title} by ${book.author}`;
                    loanBookSelect.appendChild(option);
                }
            });
        }
        
        // Set default due date (2 weeks from now)
        const dueDateInput = document.getElementById('loan-due-date');
        if (dueDateInput) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 14);
            dueDateInput.value = dueDate.toISOString().split('T')[0];
        }
        
        loanModal.style.display = 'block';
    });
}

if (closeLoanModal && loanModal) {
    closeLoanModal.addEventListener('click', () => {
        loanModal.style.display = 'none';
    });
}

if (cancelLoanBtn && loanModal) {
    cancelLoanBtn.addEventListener('click', () => {
        loanModal.style.display = 'none';
    });
}

if (createLoanBtn) {
    createLoanBtn.addEventListener('click', async () => {
        const bookId = document.getElementById('loan-book').value;
        const dueDate = document.getElementById('loan-due-date').value;
        
        if (!bookId || !dueDate) {
            showAlert('loan-form-alert', 'Please select a book and due date', 'error');
            return;
        }
        
        try {
            const token = localStorage.getItem('aperiolibrum_token');
            const response = await fetch(`${API_BASE}/loans/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    book_id: parseInt(bookId),
                    user_id: currentUser.id,
                    due_date: dueDate
                })
            });
            
            if (response.ok) {
                showAlert('loan-form-alert', 'Loan created successfully!', 'success');
                loanModal.style.display = 'none';
                displayLoans();
            } else {
                const error = await response.json();
                showAlert('loan-form-alert', error.detail || 'Failed to create loan', 'error');
            }
        } catch (error) {
            showAlert('loan-form-alert', 'Error creating loan', 'error');
        }
    });
}

// Reservation modal
const reservationModal = document.getElementById('reservation-modal');
const newReservationBtn = document.getElementById('new-reservation-btn');
const closeReservationModal = document.getElementById('close-reservation-modal');
const cancelReservationBtn = document.getElementById('cancel-reservation-btn');
const createReservationBtn = document.getElementById('create-reservation-btn');

if (newReservationBtn && reservationModal) {
    newReservationBtn.addEventListener('click', async () => {
        // Load unavailable books (for reservation)
        const books = await loadBooks();
        const reservationBookSelect = document.getElementById('reservation-book');
        
        if (reservationBookSelect) {
            reservationBookSelect.innerHTML = '<option value="">Select a book</option>';
            books.forEach(book => {
                if (book.available_copies <= 0) {
                    const option = document.createElement('option');
                    option.value = book.id;
                    option.textContent = `${book.title} by ${book.author}`;
                    reservationBookSelect.appendChild(option);
                }
            });
        }
        
        reservationModal.style.display = 'block';
    });
}

if (closeReservationModal && reservationModal) {
    closeReservationModal.addEventListener('click', () => {
        reservationModal.style.display = 'none';
    });
}

if (cancelReservationBtn && reservationModal) {
    cancelReservationBtn.addEventListener('click', () => {
        reservationModal.style.display = 'none';
    });
}

if (createReservationBtn) {
    createReservationBtn.addEventListener('click', async () => {
        const bookId = document.getElementById('reservation-book').value;
        
        if (!bookId) {
            showAlert('reservation-form-alert', 'Please select a book', 'error');
            return;
        }
        
        try {
            const token = localStorage.getItem('aperiolibrum_token');
            const response = await fetch(`${API_BASE}/reservations/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    book_id: parseInt(bookId),
                    user_id: currentUser.id
                })
            });
            
            if (response.ok) {
                showAlert('reservation-form-alert', 'Reservation created successfully!', 'success');
                reservationModal.style.display = 'none';
                displayReservations();
            } else {
                const error = await response.json();
                showAlert('reservation-form-alert', error.detail || 'Failed to create reservation', 'error');
            }
        } catch (error) {
            showAlert('reservation-form-alert', 'Error creating reservation', 'error');
        }
    });
}

// Profile update button
const updateProfileBtn = document.getElementById('update-profile-btn');
if (updateProfileBtn) {
    updateProfileBtn.addEventListener('click', updateProfile);
}

// Search functionality
const bookSearch = document.getElementById('book-search');
if (bookSearch) {
    bookSearch.addEventListener('input', async (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const books = await loadBooks();
        const booksGrid = document.getElementById('books-grid');
        
        if (booksGrid) {
            const filteredBooks = books.filter(book => 
                book.title.toLowerCase().includes(searchTerm) ||
                book.author.toLowerCase().includes(searchTerm)
            );
            
            booksGrid.innerHTML = '';
            
            if (filteredBooks.length === 0) {
                booksGrid.innerHTML = '<p>No books found matching your search</p>';
            } else {
                filteredBooks.forEach(book => {
                    const bookCard = createBookCard(book);
                    booksGrid.appendChild(bookCard);
                });
            }
        }
    });
}
