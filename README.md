# DRD Connect App

A mobile application built with Ionic and Angular for managing DRD Connect services.

## Features

- User authentication with Supabase
- Code trading and validation system
- Real-time chat functionality
- Balance management
- Secure code generation and validation

## Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- Ionic CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Supabase account
- OpenAI API key (for judge service)

## Setup

1. Clone the repository:
```bash
git clone [repository-url]
cd drd-capacitor-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

4. Start the development server:
```bash
ionic serve
```

## Building for Production

### Android
```bash
ionic capacitor build android
```

### iOS
```bash
ionic capacitor build ios
```

## Testing

Run unit tests:
```bash
npm test
```

Run e2e tests:
```bash
npm run e2e
```

## Project Structure

- `src/` - Source code
  - `app/` - Angular components and services
  - `assets/` - Static assets
  - `environments/` - Environment configurations
  - `theme/` - Global styles and variables
- `www/` - Built application files
- `supabase/functions/` - Supabase Edge Functions

## Development

- Use `ionic serve` for local development
- Use `ionic build` to create production build
- Use `ionic capacitor sync` to sync with native platforms

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 