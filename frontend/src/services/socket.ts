import { io } from 'socket.io-client';

const URL = import.meta.env.PROD 
  ? 'livecanvas-fjancxf4czdbcjg0.canadacentral-01.azurewebsites.net'
  : 'localhost:3000';

const socket = io(URL);

export default socket;
