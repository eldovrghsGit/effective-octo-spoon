# GitHub Copilot SDK Setup

## Prerequisites

The AI Assistant feature requires GitHub Copilot CLI to be installed and configured.

### Installation Steps:

#### 1. Install GitHub CLI
```powershell
winget install --id GitHub.cli
```
Or download from: https://cli.github.com/

#### 2. Install Copilot Extension
```powershell
gh extension install github/gh-copilot
```

#### 3. Authenticate
```powershell
gh auth login
```

#### 4. Verify Installation
```powershell
gh copilot --version
```

### Requirements:
- Active GitHub account
- GitHub Copilot subscription (Individual, Business, or Enterprise)
- GitHub CLI version 2.0.0 or later

### Troubleshooting:

**Error: "Copilot request timed out"**
- Ensure GitHub CLI is installed: `gh --version`
- Check if Copilot extension is installed: `gh extension list`
- Verify authentication: `gh auth status`
- Try: `gh copilot explain "test"`

**Error: "Failed to initialize Copilot"**
- Restart the application
- Check if you have an active Copilot subscription
- Update GitHub CLI: `gh extension upgrade gh-copilot`

### Alternative: Disable Copilot

If you don't want to use Copilot, you can:
1. Simply ignore the purple AI button
2. Or remove the Copilot integration by deleting the `src/main/copilot` folder

For more information: https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line
