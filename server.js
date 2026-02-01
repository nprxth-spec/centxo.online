/**
 * Custom Next.js Production Server for Plesk Deployment
 * This file is used to start the Next.js application on Plesk hosting
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Environment configuration
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const defaultPort = parseInt(process.env.PORT || '4000', 10);

// Function to find available port
function findAvailablePort(startPort, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;
    let attempts = 0;

    function tryPort() {
      if (attempts >= maxAttempts) {
        reject(new Error(`Could not find available port after ${maxAttempts} attempts`));
        return;
      }

      const testServer = createServer();
      
      testServer.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
          currentPort++;
          attempts++;
          tryPort();
        } else {
          reject(err);
        }
      });

      testServer.once('listening', () => {
        testServer.close(() => {
          resolve(currentPort);
        });
      });

      testServer.listen(currentPort, hostname);
    }

    tryPort();
  });
}

// Initialize Next.js app
async function startServer() {
  try {
    const port = await findAvailablePort(defaultPort);
    
    const app = next({ dev, hostname, port });
    const handle = app.getRequestHandler();

    await app.prepare();
    
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('Internal server error');
      }
    })
      .once('error', (err) => {
        console.error('Server error:', err);
        process.exit(1);
      })
      .listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log(`> Environment: ${process.env.NODE_ENV}`);
        if (port !== defaultPort) {
          console.log(`> Note: Using port ${port} (default port ${defaultPort} was in use)`);
        }
      });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      process.exit(0);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
