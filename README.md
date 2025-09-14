# 🧠 Word Memorization Trainer

A comprehensive web application for memorizing and training English words with advanced features including audio pronunciation, error tracking, and detailed analytics.

## Features

### 🎯 Core Training Features
- **Word Management**: Add, search, and manage your word collection
- **Audio Pronunciation**: Support for both US and UK English pronunciation
- **Training Sessions**: Customizable training with repeat counts, intervals, and speed control
- **Error Tracking**: Automatic recording of spelling and pronunciation errors
- **Error Training**: Focused practice on previously incorrect words with 4 rounds of random selection

### 📊 Analytics & Insights
- **Learning Progress**: Track your improvement over time
- **Error Analysis**: Detailed breakdown of error types and patterns
- **Word Mastery**: Monitor which words you've mastered vs. need more practice
- **Recommendations**: Get personalized suggestions for words to practice
- **Session Analysis**: Deep dive into individual training session performance

### 🎨 User Experience
- **Modern UI**: Clean, responsive design with Material Design components
- **Real-time Feedback**: Immediate feedback on correct/incorrect answers
- **Progress Tracking**: Visual progress bars and statistics
- **Mobile Friendly**: Responsive design that works on all devices

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database
- **RESTful API** design
- **Audio processing** with pydub and ffmpeg

### Frontend
- **Angular 17** with TypeScript
- **Angular Material** for UI components
- **RxJS** for reactive programming
- **SCSS** for styling

## Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd memorize-words
```

### 2. Install Backend Dependencies
```bash
npm install
```

### 3. Install Frontend Dependencies
```bash
cd client
npm install
cd ..
```

### 4. Database Setup
1. Make sure MySQL is running on localhost:3306
2. Create a database user with root access (no password)
3. Run the database initialization script:
```bash
npm run init-db
```

### 5. Start the Application

#### Development Mode
```bash
# Terminal 1 - Start backend server
npm run dev

# Terminal 2 - Start frontend development server
npm run client
```

#### Production Mode
```bash
# Build frontend
npm run build

# Start production server
npm start
```

## Usage

### 1. Adding Words
- Navigate to the "Words" section
- Add individual words or bulk import from text
- Words are automatically processed and pronunciation audio is downloaded

### 2. Training Sessions
- Go to "Training" section
- Select words to practice
- Configure training settings (repeat count, interval, accent, speed)
- Start training and follow the prompts

### 3. Error Training
- Access "Error Training" section
- Select a previous training session
- Generate random error rounds focusing on challenging words
- Practice with 4 rounds of random error word selection

### 4. Analytics
- View "Analysis" section for detailed insights
- Track learning progress over time
- Analyze error patterns and word mastery
- Get personalized recommendations

## API Endpoints

### Words
- `GET /api/words` - Get all words
- `POST /api/words` - Add a word
- `POST /api/words/batch` - Add multiple words
- `GET /api/words/search/:query` - Search words
- `GET /api/words/:id/audio` - Get audio URL
- `POST /api/words/:id/download-audio` - Download audio file
- `DELETE /api/words/:id` - Delete a word

### Training
- `GET /api/training/sessions` - Get all training sessions
- `POST /api/training/sessions` - Create training session
- `GET /api/training/sessions/:id` - Get specific session
- `PUT /api/training/sessions/:id/status` - Update session status
- `POST /api/training/sessions/:id/results` - Save training results
- `DELETE /api/training/sessions/:id` - Delete session

### Errors
- `GET /api/errors` - Get error records
- `GET /api/errors/stats` - Get error statistics
- `GET /api/errors/top-errors` - Get most challenging words
- `POST /api/errors/training-rounds` - Create error training round
- `GET /api/errors/training-rounds` - Get error training rounds
- `POST /api/errors/generate-random-round` - Generate random error round

### Analysis
- `GET /api/analysis/overview` - Get overview analysis
- `GET /api/analysis/session/:id` - Get session analysis
- `GET /api/analysis/progress` - Get progress analysis
- `GET /api/analysis/word-mastery` - Get word mastery analysis
- `GET /api/analysis/recommendations` - Get learning recommendations

## Database Schema

### Tables
- **words**: Stores word information and audio URLs
- **training_sessions**: Training session metadata and settings
- **word_errors**: Error records with type and frequency
- **error_training_rounds**: Error-focused training rounds
- **training_stats**: Statistical data for each session

## Configuration

### Backend Configuration
Edit `server/app.js` to modify:
- Database connection settings
- Server port
- CORS settings

### Frontend Configuration
Edit `client/src/app/services/*.service.ts` to modify:
- API base URL
- Request timeouts
- Error handling

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure MySQL is running
   - Check database credentials in `server/app.js`
   - Run `npm run init-db` to initialize database

2. **Audio Playback Issues**
   - Check if audio files are downloaded
   - Verify ffmpeg installation for audio processing
   - Check browser audio permissions

3. **Frontend Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Angular CLI version compatibility
   - Verify all dependencies are installed

4. **CORS Issues**
   - Ensure backend server is running
   - Check CORS configuration in `server/app.js`
   - Verify API endpoints are accessible

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

## Roadmap

- [ ] Mobile app version
- [ ] Offline support
- [ ] Advanced analytics with charts
- [ ] Word difficulty assessment
- [ ] Social features and leaderboards
- [ ] Integration with external dictionaries
- [ ] Spaced repetition algorithm
- [ ] Voice recognition for pronunciation practice