# AperioLibrum - Deployment Guide

## 🚀 Quick Start (Local)

```bash
# Clone the repository
git clone https://github.com/Finnerdespin/mistral-ai-aperiolibrum.git
cd mistral-ai-aperiolibrum

# Install dependencies
pip install -r backend/requirements.txt

# Run the application
python main.py

# Open in browser
# http://localhost:8000
```

---

## 🐳 Docker Deployment

### Build and Run

```bash
# Build the Docker image
docker build -t aperiolibrum .

# Run the container
docker run -p 8000:8000 aperiolibrum

# Access at http://localhost:8000
```

### Docker Compose (Recommended)

```bash
# Start the application
docker-compose up -d

# Stop the application
docker-compose down

# View logs
docker-compose logs -f
```

---

## ☁️ Cloud Deployment Options

### 1. Render.com (Free Tier Available)

**Steps:**
1. Go to https://render.com and sign up
2. Click "New" → "Web Service"
3. Connect your GitHub repository: `Finnerdespin/mistral-ai-aperiolibrum`
4. Configure:
   - **Name**: aperiolibrum
   - **Region**: Choose closest to you
   - **Branch**: main
   - **Root Directory**: (leave empty)
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `python main.py`
5. Click "Create Web Service"
6. Your app will be live at the provided URL

**Note**: Add environment variable `SECRET_KEY` with a strong random value.

---

### 2. Railway.app (Free Tier Available)

**Steps:**
1. Go to https://railway.app and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository: `Finnerdespin/mistral-ai-aperiolibrum`
4. Railway will automatically detect the Python app
5. Add environment variable:
   - Key: `SECRET_KEY`
   - Value: `your-secret-key-here`
6. Click "Deploy"
7. Your app will be live

---

### 3. Fly.io (Free Tier Available)

**Steps:**
1. Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
2. Sign up: `fly auth signup`
3. Create a new app:
   ```bash
   fly launch --name aperiolibrum
   ```
4. When prompted:
   - Select your organization
   - Choose a region
   - Select "Python" as the app type
   - Choose to deploy now
5. Set the secret key:
   ```bash
   fly secrets set SECRET_KEY=your-secret-key-here
   ```
6. Deploy:
   ```bash
   fly deploy
   ```
7. Your app will be live at the provided URL

---

### 4. Vercel (for Frontend + Serverless Backend)

**For the frontend only:**
1. Create a `vercel.json` file:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "frontend/index.html",
         "use": "@vercel/static"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "frontend/$1"
       }
     ]
   }
   ```
2. Deploy the frontend to Vercel
3. For the backend, use one of the options above or deploy to Vercel with serverless functions

**Note**: Vercel is better suited for frontend hosting. For full-stack, use Render, Railway, or Fly.io.

---

### 5. PythonAnywhere (Free for basic use)

**Steps:**
1. Go to https://www.pythonanywhere.com and sign up for a free account
2. Open a Bash console
3. Clone your repository:
   ```bash
   git clone https://github.com/Finnerdespin/mistral-ai-aperiolibrum.git
   cd aperiolibrum
   ```
4. Create a virtual environment:
   ```bash
   mkvirtualenv aperiolibrum
   pip install -r backend/requirements.txt
   ```
5. Go to the "Web" tab
6. Configure your web app:
   - **Source code**: `/home/yourusername/aperiolibrum`
   - **Working directory**: `/home/yourusername/aperiolibrum`
   - **WSGI configuration file**: Create a new one
7. Edit the WSGI file:
   ```python
   import sys
   path = '/home/yourusername/aperiolibrum'
   if path not in sys.path:
       sys.path.append(path)
   
   from backend.main import app
   ```
8. Save and reload your web app
9. Your app will be live at: `https://yourusername.pythonanywhere.com`

---

### 6. Replit (Free, Easy for Testing)

**Steps:**
1. Go to https://replit.com
2. Click "Start Coding"
3. Import from GitHub: Select your repository
4. Click "Run" to start the application
5. Your app will be live at the provided Replit URL

**Note**: Replit has limitations on free tier (sleeps when inactive).

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Secret key for JWT tokens (generate a strong one)
SECRET_KEY=your-very-long-random-secret-key-here

# Token expiration time (in minutes)
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database settings (for future database integration)
# DATABASE_URL=sqlite:///./database.db
```

**Generate a secure secret key:**
```python
import secrets
print(secrets.token_urlsafe(64))
```

---

## 📝 Production Notes

### Security Recommendations:

1. **Use HTTPS**: Always deploy with HTTPS enabled
2. **Strong Secret Key**: Use a long, random secret key
3. **Database**: Replace the in-memory database with PostgreSQL or MySQL for production
4. **Password Hashing**: The current implementation stores passwords in plain text. For production, uncomment and use the password hashing in `auth.py`
5. **Rate Limiting**: Consider adding rate limiting for API endpoints

### Database Migration (for future):

To switch from in-memory to a real database:

1. Install SQLAlchemy:
   ```bash
   pip install sqlalchemy
   ```

2. Update `database.py` to use SQLAlchemy models
3. Update `config.py` with your database URL

---

## 🐛 Troubleshooting

### Common Issues:

**1. Port already in use**
```bash
# Find and kill the process using port 8000
lsof -i :8000
kill -9 <PID>
```

**2. Module not found**
```bash
pip install -r backend/requirements.txt
```

**3. Application not starting**
```bash
# Check logs
python main.py

# Or for Docker
docker-compose logs -f
```

**4. CORS issues**
The application has CORS enabled for all origins. For production, update the `CORSMiddleware` in `backend/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📞 Support

If you encounter any issues during deployment:

1. Check the logs for error messages
2. Verify all dependencies are installed
3. Ensure environment variables are set correctly
4. Try running locally first to verify the application works

---

## 🎉 Success!

Once deployed, your AperioLibrum library management system will be accessible at your chosen platform's URL. You can then:

- Register users
- Add books
- Manage loans and reservations
- Track fines
- Use the full library management features

Happy deploying! 🚀
