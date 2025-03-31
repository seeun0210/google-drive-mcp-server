# Google Drive MCP Server

MCP server for integrating with Google Drive and Google Sheets.

## Setup Instructions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API and Google Sheets API for your project
4. Configure the OAuth consent screen:

   - Go to "OAuth consent screen"
   - Select "External" user type
   - Fill in the application name and required information
   - Add the required scopes for Drive and Sheets
   - Add your email as a test user

5. Create OAuth 2.0 credentials:
   - Go to "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Desktop app" as the application type
   - Name your client
   - Download the client configuration file
   - Rename it to `credentials.json` and place it in the root directory of this project

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

The first time you run the server, it will prompt you to authorize access to your Google account. Follow the instructions in your browser to complete the authorization process.

## Configuration

The server requires the following files:

- `credentials.json`: OAuth 2.0 client configuration from Google Cloud Console
- `token.json`: Generated after first authorization (do not edit manually)

## Available Tools

- `read-spreadsheet`: Read data from Google Sheets
- More tools coming soon...
