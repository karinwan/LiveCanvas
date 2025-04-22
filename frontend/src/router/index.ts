import { createRouter, createWebHistory } from 'vue-router';
import { useSocketioStore } from '@/stores/socketio';
import flowchart from '@/pages/flowChart/index.vue';
import socketExample from '@/pages/examples/socketExample.vue';
import drawingBoard from '@/pages/canvasBoard/drawingBoard.vue';
import mainPage from '@/pages/mainPage.vue';


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: mainPage,
    },
    {
      path: '/example/socket', // For WebScoket testing purpose
      component: socketExample,
    },
    {
      path: '/board/:roomId', // Board with room ID parameter
      name: 'drawing_board',
      component: drawingBoard,
      props: true,
      beforeEnter: async (to, from, next) => {
        const socketStore = useSocketioStore();
        const roomId = to.params.roomId as string;

        try {
          const roomType = await socketStore.getRoomType(roomId);

          if (roomType === 'drawing_board') {
            next();
          } else {
            alert('Invalid room type! Redirecting to home. Type: ' + roomType);
            next('/'); 
          }
        } catch (error) {
          console.error('Error fetching room type:', error);
          alert('Room not found! Redirecting to home.');
          next('/'); 
        }
      }
    },
    {
      path: '/flowchart/:roomId',
      name: 'flowchart',
      component: flowchart,
      props: true,
      beforeEnter: async (to, from, next) => {
        const socketStore = useSocketioStore();
        const roomId = to.params.roomId as string;

        try {
          const roomType = await socketStore.getRoomType(roomId);

          if (roomType === 'flowchart') {
            next(); 
          } else {
            alert('Invalid room type! Redirecting to home. Type: ' + roomType);
            next('/'); 
          }
        } catch (error) {
          console.error('Error fetching room type:', error);
          alert('Room not found! Redirecting to home.');
          next('/'); 
        }
      }
    },
  ],
});

export default router;
