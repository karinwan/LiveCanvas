# LiveCanvas

## About

The Online Flowchart and Draw Board Editor is a web-based application designed for seamless **real-time collaboration**. It allows users to create **flowcharts** and **freehand drawings** with an intuitive drag-and-drop interface. No sign-up is required, making it easily accessible to anyone.

Key features include:
- **Synchronized Editing**: Multiple users can collaborate in real-time on both the **flowchart** and **draw board**.
- **Draw Board**: Users can sketch ideas freely and export their drawings to **JSON** format.
- **Flowchart Creation**: Drag-and-drop flowchart elements with customizable templates.
- **Room-based Collaboration**: Users can create a new session or join an existing one using a **Room ID/Export Link**.
- **Export Support**: Save work in **JSON** formats for compatibility with other tools.

By eliminating the need for manual coding and registration, this platform enhances workflow efficiency across various industries, including business, education, and software development.

## Build With

This project is built using the following technologies:

### **Frontend**
- **Vue 3** – Modern JavaScript framework for building the user interface.
- **Vuetify** – UI library for responsive and material design components.
  - **Icons**: [mdi](https://pictogrammers.com/library/mdi/) – Material Design Icons for UI elements.
- **Konva.js** – A powerful library for working with the HTML5 canvas, enabling better hand-drawing and object management

### **Backend**
- **Flask** – Lightweight Python web framework for handling API requests and server logic.

### **Real-Time Collaboration**
- **Socket.io** – Enables real-time, bidirectional event-based communication between users, supporting synchronized editing and message handling.

The combination of these technologies ensures a seamless, **real-time collaborative experience** for drawing and flowchart creation, with **efficient WebSocket communication** and **intuitive UI interactions**.

## Getting started

Follow these instructions to set up and run the project locally.

### **Prerequisites**
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (Recommended: latest LTS version)
- [npm](https://www.npmjs.com/) (Comes with Node.js)
- [Python](https://www.python.org/) (for the Flask backend)

### **Installation and Setup**

#### **1️⃣  Install Frontend Dependencies**
```sh
cd frontend
npm install
```
#### **2️⃣   Run the Development Server**
```sh
npm run dev
```
The frontend should now be running. Open the displayed localhost URL in your browser.

<!-- ##  Successful Running - What to Expect

After successfully setting up the project, here’s what you should see when everything is running correctly.

### Frontend Running Successfully
- The web app should be like:

### Backend Running Successfully
- The Flask server should be like:

### Real-Time Collaboration Working
- Multiple users can join the same **room** using the **Room ID**.
- Any actions made by one user (e.g., drawing, adding flowchart elements) should **instantly sync** across all connected users.
- Users should be able to **collaboratively edit** without delays.

### Exporting to JSON
- Both **flowcharts** and **drawings** should have an **Export to JSON** option.
- Clicking **Export** should download a `.json` file containing the drawing or flowchart data.

### No Errors in Console
- Open the browser’s **developer console (`F12` or `Cmd+Option+I`)**.
- There should be **no red error messages** indicating broken functionality.
- If everything is working fine, you should only see standard logs related to WebSocket connections. -->


## Test and Deploy

Unit Test:

In frontend folder, 
```sh
cd tests, run npm run test
```
In backend folder,
```sh
cd tests run pytest
```


### Testing

We use **pytest** for backend testing and **Vitest** for frontend testing to ensure reliability, stability, and correctness of our application.

#### Backend Testing (Python)
- **Tool:** [`pytest`](https://docs.pytest.org/en/latest/)
- **Purpose:** Runs automated tests for backend logic and API endpoints.
- **How to Run Tests Manually:**
  ```sh
  cd backend
  python -m pytest
  ```

#### Frontend Testing (Vue.js)
- **Tool:** [`Vitest`](https://vitest.dev/)
- **Purpose:** Unit tests for Vue components and frontend logic.
- **How to Run Tests Manually:**
  ```sh
  cd frontend
  npm run test
  ```

### Selenium Auto test
- Run command, the chromedriver will automatically run our test plan:
- 12 cases: [flowchart test plan](https://uofwaterloo-my.sharepoint.com/:x:/r/personal/q22wan_uwaterloo_ca/_layouts/15/Doc.aspx?sourcedoc=%7B57300F2F-0E4E-43A1-B18E-2CB348A36BE5%7D&file=Flowchart_Test_Cases.xlsx&action=default&mobileredirect=true&wdOrigin=OUTLOOK-METAOS.FILEBROWSER.FILES-PEOPLEL2-FOLDER)
- 19 cases: [drawboars test plan](https://uofwaterloo-my.sharepoint.com/:w:/r/personal/q22wan_uwaterloo_ca/_layouts/15/Doc.aspx?sourcedoc=%7B695C7204-FFEA-4298-A638-2DE9578D3DB9%7D&file=LiveCanvas_Test_Cases.docx&action=default&mobileredirect=true&wdOrigin=OUTLOOK-METAOS.FILEBROWSER.FILES-PEOPLEL2-FOLDER)
  ```sh
  npx ts-node tests/selenium/*.test.ts
  ```


### Code Linting
To maintain code quality and consistency, we use **linting tools** for both the backend and frontend.

#### Backend Linting (Python)
- **Tool:** `black`
- **Purpose:** Ensures consistent code formatting for Python files.
- **How to Run Linting Manually:**
  ```sh
  cd backend
  black .
  ```   
#### Frontend Linting (Vue)
- **Tool:** `ESLint`
- **Purpose:** Enforces coding standards in Vue.js components and JavaScript files.
- **How to Run Linting Manually:**
  ```sh
  cd frontend
  npm run lint
