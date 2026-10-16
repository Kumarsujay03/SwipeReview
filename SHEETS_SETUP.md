# Google Sheets Setup Guide

This guide will help you set up the Google Apps Script backend for your LinkedIn Content Review application.

## Your Spreadsheet Structure

```
📊 Content_calender (Your Google Spreadsheet)
   └── 📄 Linkedin (Sheet tab inside the spreadsheet)
       └── Columns: ID | Title | Content | Date | Status | Comment
   └── 📄 Users (Reviewer accounts, created by the script menu)
       └── Columns: Name | Email | Salt | PasswordHash
```

> **Important:** 
> - **Spreadsheet name**: "Content_calender" (the file name in Google Drive)
> - **Sheet tab name**: "Linkedin" (the tab at the bottom of the spreadsheet)

## Prerequisites

- A Google Spreadsheet named **"Content_calender"** (or any name you prefer)
- Inside that spreadsheet, a sheet tab named: **"Linkedin"** (case-sensitive)
- Required columns (in this exact order):
  - Column A: `ID`
  - Column B: `Title`
  - Column C: `Content`
  - Column D: `Date`
  - Column E: `Status` (leave empty for new items)
  - Column F: `Comment` (leave empty for new items)

## Step 1: Prepare Your Google Sheet

1. Open your **"Content_calender"** Google Spreadsheet
2. Make sure you have a sheet tab named **"Linkedin"** (case-sensitive)
   - This is the tab at the bottom of your spreadsheet, not the spreadsheet name
3. Ensure your first row has these headers:
   ```
   ID | Title | Content | Date | Status | Comment
   ```
4. Add some sample data (leave Status and Comment columns empty for pending items)

### Example Data:

| ID | Title | Content | Date | Status | Comment |
|----|-------|---------|------|--------|---------|
| 1 | Post about AI | Excited to share our new AI features! #tech | 2024-12-01 | | |
| 2 | Team Update | Meet our amazing engineering team! | 2024-12-02 | | |
| 3 | Product Launch | Launching our new product today! | 2024-12-03 | | |

## Step 2: Create the Apps Script

1. In your **"Content_calender"** spreadsheet, click **Extensions** > **Apps Script**
2. Delete any existing code in the editor
3. Copy the entire contents of `google-apps-script.js` from this project
4. Paste it into the Apps Script editor
5. Click the **Save** icon (💾) or press `Ctrl+S`
6. Give your project a name (e.g., "LinkedIn Content API")

> [!IMPORTANT]
> **Do NOT click the "Run" button!** 
> 
> If you try to run `doGet` or `doPost` directly in the editor, you'll get an error like:
> ```
> TypeError: Cannot read properties of undefined (reading 'parameter')
> ```
> 
> This is normal! These functions are designed to be called via HTTP requests (when deployed as a web app), not run manually. Just save the code and proceed to Step 3 to deploy it.

## Step 3: Deploy as Web App

1. In the Apps Script editor, click **Deploy** > **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure the deployment:
   - **Description**: "LinkedIn Content Review API" (or any name you prefer)
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: **Anyone** (this allows your web app to access it)
   
   > ⚠️ **Important**: Choosing "Anyone" means anyone with the URL can access your script. The script only reads/writes to your specific sheet, but make sure you're comfortable with this.

5. Click **Deploy**
6. **Authorize the script**:
   - Click **Authorize access**
   - Choose your Google account
   - Click **Advanced** (if you see a warning)
   - Click **Go to [Your Project Name] (unsafe)**
   - Click **Allow**

7. **Copy the Web App URL**:
   - After authorization, you'll see a "Web app URL"
   - It will look like: `https://script.google.com/macros/s/AKfycby.../exec`
   - **Copy this URL** - you'll need it for the frontend configuration

> **Note:** The script uses `getActiveSpreadsheet()` which means it automatically works with the spreadsheet it's attached to ("Content_calender" in your case). It then looks for the "Linkedin" sheet tab inside that spreadsheet.

## Step 4: Add Reviewers

Reviewers sign in with an email and password that the Apps Script checks against a **Users** tab. Passwords are never stored, only a random salt and a salted, iterated SHA-256 hash.

1. Reload your spreadsheet. A **SwipeReview** menu appears in the menu bar (added by the script's `onOpen` function).
2. Click **SwipeReview** > **Add / update reviewer**. The first time, Google asks you to authorize the script.
3. Enter the reviewer's name, email and a password of at least 10 characters.
4. The script creates the **Users** tab if needed and writes `Name | Email | Salt | PasswordHash`. Running it again for an existing email replaces that reviewer's password.

Repeat for each reviewer, then share each password with its reviewer through a private channel.

> **Notes**
> - To remove a reviewer, delete their row in the **Users** tab.
> - Anyone with access to the spreadsheet can see the hashes, so only share the spreadsheet with people you trust. Don't edit the Salt or PasswordHash cells by hand.
> - If you changed the script, redeploy it (see "Updating the Script") so the web app picks up the `login` action.

## Step 5: Test the API

### Test GET Request (Fetch Pending Items)

Open a new browser tab and paste your Web App URL. You should see a JSON response like:

```json
{
  "data": [
    {
      "id": 1,
      "title": "Post about AI",
      "content": "Excited to share our new AI features! #tech",
      "timestamp": "2024-12-01",
      "status": "",
      "comments": ""
    }
  ]
}
```

### Test GET Request (Fetch History)

Add `?history=true` to your URL:
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?history=true
```

This should return an empty array `{"data": []}` if you haven't processed any items yet.

### Test Update Request

Status updates are sent as GET requests with `action=update`:

```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=update&id=1&status=Approved&userName=John%20Doe&comment=Great%20content!
```

After this, check your Google Sheet - the row with ID 1 should now have:
- Status: "Approved by John Doe"
- Comment: "Great content!"

### Test Login

Login is a POST request so the password stays out of the URL. Replace the email and password with a reviewer you added in Step 4 (run this only on your own machine, since the password ends up in your shell history):

```bash
curl -L "YOUR_WEB_APP_URL" -H "Content-Type: text/plain" -d '{"action":"login","email":"reviewer@example.com","password":"..."}'
```

A correct password returns `{"success":true,"user":{...}}`; anything else returns `{"error":"Invalid credentials"}`.

## Step 6: Configure Your Frontend

1. Copy `.env.example` to `.env` in the project root
2. Set your Web App URL:

```
VITE_SHEETS_API_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

3. Restart `npm run dev` so Vite picks up the change. For Vercel, add the same variable in the project settings.

If `VITE_SHEETS_API_URL` is unset, the app runs in demo mode with mock data and accepts any email and password.

## Step 7: Run Your Application

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the app in your browser (usually `http://localhost:5173`)

3. Sign in with a reviewer email and password from Step 4

4. You should see cards from your Google Sheet!

## Troubleshooting

### "Sheet 'Linkedin' not found" error
- Make sure your sheet tab is named exactly **"Linkedin"** (case-sensitive)
- Check that you're using the correct Google Sheet

### CORS errors
- Make sure you deployed the script with "Who has access: Anyone"
- Redeploy if you changed this setting

### No data showing up
- Check that your sheet has the correct column headers
- Verify that the Status column is empty for items you want to review
- Check the browser console for error messages

### "Invalid credentials" when signing in
- Make sure the reviewer exists in the **Users** tab (add them via **SwipeReview > Add / update reviewer**)
- Re-set the password from the menu if you're unsure of it
- Make sure you redeployed the script as a **New version** after adding the `login` action

### Status not updating
- Verify the update request is being sent correctly (browser console logs the URL)
- Check that the ID in your data matches the ID in the sheet
- Look at the Apps Script execution logs: **Extensions > Apps Script > Executions**

### Error: "Cannot read properties of undefined (reading 'parameter')"
- **This is normal!** This error appears if you try to run `doGet` or `doPost` directly in the Apps Script editor
- These functions are designed to be called via HTTP requests (web app), not run manually
- **Solution:** Don't click "Run" - just save the code and deploy it as a web app (Step 3)
- Once deployed, test it by visiting the Web App URL in your browser

## Updating the Script

If you need to make changes to the Apps Script:

1. Edit the code in the Apps Script editor
2. Save your changes
3. Click **Deploy** > **Manage deployments**
4. Click the edit icon ✏️ next to your deployment
5. Change the version to **New version**
6. Click **Deploy**

The Web App URL will remain the same, so you don't need to update your frontend.

## Security Notes

- The Web App URL is public, but it only accesses your specific Google Sheet
- Reviewer passwords are checked server-side and only salted hashes are stored in the **Users** tab; never put credentials in the frontend code
- Login protects the app UI, but the fetch and update endpoints themselves are not token-protected, so anyone with the URL can still call them directly
- Never commit your Web App URL to public repositories if your data is sensitive
- You can revoke access anytime by going to **Deploy > Manage deployments > Archive**

## Next Steps

Once everything is working:
1. Add more content to your Google Sheet
2. Test the approve/reject functionality
3. Test adding comments
4. Check the History view to see processed items
5. Verify that the Status column shows "Approved by [Name]" or "Rejected by [Name]"

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check Apps Script execution logs: **Extensions > Apps Script > Executions**
3. Verify your sheet structure matches the requirements
4. Make sure all column names are spelled correctly
