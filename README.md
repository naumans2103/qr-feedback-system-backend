This is the Backend Code for the Qr Feedback System project. It is running currently on render and cannot be ran locally. Please access the ReadME.md file on the frontend to access and run the project.

ReadME.md (that is on the front end)

## How to start the project ##

1. Install dependencies in terminal
   
   ```bash
   npm install
   
2. Create a new file called .env in the root folder of the project in terminal:

   touch .env

3. Open the .env file and add the following line:

   EXPO_PUBLIC_API_URL=https://qr-feedback-system-backend-1.onrender.com

4. Open the link https://qr-feedback-system-backend-1.onrender.com on a browser and wait 30-60 seconds in order for Render to wake up (Render puts inactive services to sleep). Make sure the screen shows: API is running successfully.

5. MAKE SURE TO BE CONNECTED TO THE SAME WIFI NETWORK FROM YOUR PHONE TO YOUR PC WHEN SCANNING THE EXPO GO QR CODE ON THE FRONTEND

6. Download ExpoGo app on your phone

7. Start the app 

npx expo start -c

8. Scan the qr code from your phone (this should open ExpoGo app Automatically)

9. To Login as a Client Advisor: 

John Doe
Email: John.Doe@example.com 
Password: securepass

Jane Doe
Email: Jane.Doe@example.com 
Password: securepass

Liam Chen
Email: Liam.Chen@example.com
Password: securepassword

Amelia.Zane
Email: Amelia.Zane@example.com
Password: securepassword

10. To login as a Manager: 

Manager
Email: manager@example.com 
Password: securepassword

(Tip:
If Expo asks "Use port 8082 instead?", just type `Y` and press Enter.)
