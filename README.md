# Style Guider

A React application that helps improve writing by applying style guide principles using AI.

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/style-guider.git
cd style-guider
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Anthropic API key:
```
REACT_APP_ANTHROPIC_API_KEY=your_api_key_here
REACT_APP_ANTHROPIC_MODEL=claude-3-sonnet-20240229
REACT_APP_ANTHROPIC_API_URL=https://api.anthropic.com/v1
```

## Available Scripts

### `npm run dev`

Runs the app in development mode with both frontend and backend servers.\
Frontend: [http://localhost:3000](http://localhost:3000)\
Backend: [http://localhost:3001](http://localhost:3001)

### `npm run client`

Runs only the frontend in development mode.

### `npm run server`

Runs only the backend server.

### `npm run build`

Builds the app for production to the `build` folder.

### `npm start`

Runs the production server (must run `npm run build` first).

### `npm test`

Launches the test runner in interactive watch mode.

## Deployment

### Deploying to Vercel

1. Install the Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy the application:
```bash
vercel
```

4. Set up environment variables in Vercel:
   - Go to your project settings in the Vercel dashboard
   - Add the following environment variables:
     - `REACT_APP_ANTHROPIC_API_KEY`
     - `REACT_APP_ANTHROPIC_MODEL`
     - `REACT_APP_ANTHROPIC_API_URL`

5. For subsequent deployments:
```bash
vercel --prod
```

### Important Notes

- The application uses a Node.js server to proxy requests to the Anthropic API
- Both frontend and backend are deployed together
- Environment variables must be set in your deployment platform
- The production build serves the React app and API from the same domain

## Learn More

- [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React documentation](https://reactjs.org/)
- [Vercel documentation](https://vercel.com/docs)
