// AperioLibrum - Frontend JavaScript for Flask

const API_BASE = ''; // Flask routes are at the same origin

// Global state
let currentUser = null;
let books = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadUserFromSession();
    initializeRoutes();
    initializeModals();
    updateNavigation();
});

// User authentication
function loadUserFromSession() {
    // Check if user is logged in via session
    fetch('/api/users/me')
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            return null;
        })
        .then(user => {
            if (user) {
                currentUser = user;
                updateNavigation();
            }
        })
        .catch(() => {});
}

function updateNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');
    
    // Hide/show links based on auth status
    const loginLink = document.querySelector('.nav-links a[href="/login"]');
    const registerLink = document.querySelector('.nav-links a[href="/register"]');
    const profileLink = document.querySelector('.nav-links a[href="/profile"]');
    const logoutLink = document.querySelector('#logout-link');
    
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
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
            });
            
            const data = await response.json();
            if (data.success) {
                showAlert('login-alert', 'Login successful! Redirecting...', 'success');
                // Reload to get session
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                showAlert('login-alert', data.message || 'Login failed', 'error');
            }
        } catch (error) {
            showAlert('login-alert', 'Login failed. Please try again.', 'error');
        }
    }
});

// Logout
document.addEventListener('click', async (e) => {
    if (e.target.id === 'logout-btn' || e.target.id === 'logout-link') {
        e.preventDefault();
        try {
            const response = await fetch('/api/logout');
            if (response.ok) {
                currentUser = null;
                updateNavigation();
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Logout failed:', error);
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
            const response = await fetch('/api/register', {
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
            
            const data = await response.json();
            if (data.success) {
                showAlert('register-alert', 'Registration successful! Please login.', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                showAlert('register-alert', data.message || 'Registration failed', 'error');
            }
        } catch (error) {
            showAlert('register-alert', 'Registration failed. Please try again.', 'error');
        }
    }
});

// Book operations
async function loadBooks() {
    try {
        const response = await fetch('/api/books');
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
    try {
        const response = await fetch('/api/loans');
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
                    ${loan.status === 'active' ? `<button class="btn btn-success" onclick="returnBook(${loan.id})">Return</button>` : ''}
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
        const response = await fetch(`/api/loans/${loanId}/return`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            showAlert('loans-alert', 'Book returned successfully!', 'success');
            displayLoans();
        } else {
            const data = await response.json();
            showAlert('loans-alert', data.error || 'Failed to return book', 'error');
        }
    } catch (error) {
        showAlert('loans-alert', 'Error returning book', 'error');
    }
}

// Reservation operations
async function loadReservations() {
    try {
        const response = await fetch('/api/reservations');
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
                    ${reservation.status === 'pending' ? `<button class="btn btn-danger" onclick="cancelReservation(${reservation.id})">Cancel</button>` : ''}
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
        const response = await fetch(`/api/reservations/${reservationId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('reservations-alert', 'Reservation cancelled successfully!', 'success');
            displayReservations();
        } else {
            const data = await response.json();
            showAlert('reservations-alert', data.error || 'Failed to cancel reservation', 'error');
        }
    } catch (error) {
        showAlert('reservations-alert', 'Error cancelling reservation', 'error');
    }
}

// Profile operations
async function loadProfile() {
    try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
            currentUser = await response.json();
            displayProfile();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function displayProfile() {
    if (!currentUser) return;
    
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
        const response = await fetch('/api/users/me', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: fullname
            })
        });
        
        if (response.ok) {
            currentUser.full_name = fullname;
            showAlert('profile-alert', 'Profile updated successfully!', 'success');
            displayProfile();
        } else {
            const data = await response.json();
            showAlert('profile-alert', data.error || 'Failed to update profile', 'error');
        }
    } catch (error) {
        showAlert('profile-alert', 'Error updating profile', 'error');
    }
}

// Fines operations
async function loadFines() {
    try {
        const response = await fetch('/api/fines');
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
    
    const totalBooks = document.getElementById('total-books');
    const availableBooks = document.getElementById('available-books');
    
    if (totalBooks) {
        totalBooks.textContent = books.length;
    }
    
    if (availableBooks) {
        const available = books.reduce((sum, book) => sum + book.available_copies, 0);
        availableBooks.textContent = available;
    }
    
    await loadFeaturedBooks();
}

// Utility functions
function showAlert(elementId, message, type = 'info') {
    const alert = document.getElementById(elementId);
    if (!alert) return;
    
    alert.textContent = message;
    alert.className = `alert alert-${type}`;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

function initializeRoutes() {
    const path = window.location.pathname;
    
    switch (path) {
        case '/':
        case '/index.html':
            loadDashboardStats();
            break;
        case '/books':
        case '/books.html':
            loadAllBooks();
            break;
        case '/loans':
        case '/loans.html':
            loadBooks().then(displayLoans);
            break;
        case '/reservations':
        case '/reservations.html':
            loadBooks().then(displayReservations);
            break;
        case '/profile':
        case '/profile.html':
            loadBooks().then(loadProfile).then(displayFines);
            break;
    }
}

function initializeModals() {
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
