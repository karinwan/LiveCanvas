import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import index from '@/pages/flowChart/index.vue';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import socket from '@/services/socket';

const vuetifyInstance = createVuetify();

// Mock all dependencies
vi.mock('@/services/socket', () => ({
  default: {
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn()
  }
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { roomId: 'test' } }),
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('@/stores/socketio', () => ({
  useSocketioStore: () => ({
    bindEvents: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    getRoomFullErrorData: { roomId: 'test', capacity: 5, code: 'ROOM_AT_CAPACITY' }
  })
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key) => key, locale: { value: 'en' } })
}));

const updateEdgeMock = vi.fn();
const applyEdgeChangesMock = vi.fn();
let nodeDoubleClickHandler, edgeDoubleClickHandler;

vi.mock('@vue-flow/core', async () => {
  const actual = await vi.importActual('@vue-flow/core');
  return {
    ...actual,
    useVueFlow: () => ({
      onConnect: vi.fn(),
      addEdges: vi.fn(),
      onNodeDoubleClick: (cb) => { nodeDoubleClickHandler = cb },
      onEdgeDoubleClick: (cb) => { edgeDoubleClickHandler = cb },
      updateEdge: updateEdgeMock,
      toObject: vi.fn(() => ({ nodes: [], edges: [] })),
      applyNodeChanges: vi.fn(),
      applyEdgeChanges: applyEdgeChangesMock
    }),
  };
});

// Mock DOM elements
document.querySelector = vi.fn().mockImplementation(() => ({
  clientWidth: 800,
  clientHeight: 600
}));

window.sessionStorage = {
  getItem: vi.fn().mockReturnValue('test'),
  setItem: vi.fn(),
  clear: vi.fn()
};

describe('index.vue', () => {
  it('can be imported', () => {
    expect(index).toBeDefined();
  });

  let wrapper;
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/fake-url');
    global.URL.revokeObjectURL = vi.fn();
    wrapper = mount(index, {
      global: {
        plugins: [vuetifyInstance],
        stubs: {
          VueFlow: true, // Stub <VueFlow /> component
          Sidebar: {
            name: 'Sidebar', 
            template: '<div />',
            emits: ['exportToJson', 'exportToImage', 'exportToPdf', 'changeLanguage', 'openHelp', 'openFileDialog']
          },
          OnlineMember: true,
          ExportLink: true,
          FlowChartHelp: { template: '<div />' },
          TemplateSelector: { template: '<div />' },
          UndoRedoControl: true,
        }
      }
    });
  });

  it('renders the component', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('toggles help panel', async () => {
    wrapper.vm.showHelp = { openHelp: vi.fn() };
    wrapper.vm.toggleHelp();
    expect(wrapper.vm.showHelp.openHelp).toHaveBeenCalled();
  });

  it('toggles online panel', async () => {
    wrapper.vm.showOnline = false;
    await wrapper.vm.toggleOnline();
    expect(wrapper.vm.showOnline).toBe(true);
    // Toggle back
    await wrapper.vm.toggleOnline();
    expect(wrapper.vm.showOnline).toBe(false);
  });

  it('toggles export panel', async () => {
    wrapper.vm.showExport = false;
    await wrapper.vm.toggleExport();
    expect(wrapper.vm.showExport).toBe(true);
    await wrapper.vm.toggleExport();
    expect(wrapper.vm.showExport).toBe(false);
  });

  it('toggles templates panel', async () => {
    wrapper.vm.showTemplates = false;
    await wrapper.vm.toggleTemplates();
    expect(wrapper.vm.showTemplates).toBe(true);
    await wrapper.vm.toggleTemplates();
    expect(wrapper.vm.showTemplates).toBe(false);
  });

  it('shows room full dialog when user limit is exceeded', async () => {
    // Simulate store returning ROOM_AT_CAPACITY error
    wrapper.vm.store.getRoomFullErrorData = {
      code: 'ROOM_AT_CAPACITY',
      roomId: 'test-room',
      capacity: 5
    };

    // Trigger the computed error message to be used
    wrapper.vm.showRoomFullError = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.formattedRoomFullError).toBe('roomStatus.roomAtCapacityMessage');
    expect(wrapper.vm.showRoomFullError).toBe(true);
  });

  it('calls store.joinRoom with roomId and username, hides dialog, and sets isLoading to true', async () => {
    // Provide a test username
    wrapper.vm.username = 'tester';
    const joinRoomSpy = vi.spyOn(wrapper.vm.store, 'joinRoom');

    // Initially, showDialog might be true in your setup. We'll just set it for clarity.
    wrapper.vm.showDialog = true;
    wrapper.vm.isLoading = false;

    // Call the method
    wrapper.vm.handleJoinRoomClick();

    // Expect the store to have been called with (roomId, username)
    expect(joinRoomSpy).toHaveBeenCalledWith('test', 'tester');

    // Expect the dialog is closed and loading state is set
    expect(wrapper.vm.showDialog).toBe(false);
    expect(wrapper.vm.isLoading).toBe(true);
  });

  it('adds a new node when addNode is called', () => {
    const initialLength = wrapper.vm.nodes.length;
    wrapper.vm.addNode();
    expect(wrapper.vm.nodes.length).toBe(initialLength + 1);
    const newNode = wrapper.vm.nodes[wrapper.vm.nodes.length - 1];
    expect(newNode.data.label).toBe('New Node');
    expect(newNode.type).toBe('special');
    // Also, check for default positions (500, 250)
    expect(newNode.position).toEqual({ x: 500, y: 250 });
  });

  it('emits canvas_state_update when updateFlow is called', () => {
    wrapper.vm.nodes = [{ id: 'node1', data: { label: 'Test Node' } }];
    wrapper.vm.edges = [{ id: 'edge1' }];
    wrapper.vm.isLoading = false;
    wrapper.vm.updateFlow();
    expect(socket.emit).toHaveBeenCalledWith(
      'canvas_state_update',
      expect.objectContaining({
        roomId: 'test',
        isUndoRedo: false,
        canvasState: expect.any(String)
      })
    );
  });

  it('imports a template correctly via importTemplate', () => {
    const initialNodesLength = wrapper.vm.nodes.length;
    const initialEdgesLength = wrapper.vm.edges.length;
    const template = {
      nodes: [
        { id: 'n1', position: { x: 100, y: 100 }, data: { label: 'Template Node' }, style: {} }
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n1', data: {}, labelStyle: {} }
      ]
    };
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    wrapper.vm.importTemplate(template);
    expect(wrapper.vm.nodes.length).toBe(initialNodesLength + template.nodes.length);
    expect(wrapper.vm.edges.length).toBe(initialEdgesLength + template.edges.length);
    vi.restoreAllMocks();
  });

  it('opens file dialog when openFileDialog is called', () => {
    const clickSpy = vi.fn();
    wrapper.vm.fileInput = { click: clickSpy };
    wrapper.vm.openFileDialog();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('parses an uploaded file correctly in handleFileUpload', async () => {
    const mockFlow = {
      nodes: [{ id: 'nodeFromFile', data: { label: 'File Node' } }],
      edges: [{ id: 'edgeFromFile' }]
    };
    const jsonStr = JSON.stringify(mockFlow);
    const file = new File([jsonStr], 'flow.json', { type: 'application/json' });
    const event = { target: { files: [file], value: '' } };

    // Stub FileReader to simulate reading the file
    const originalFileReader = window.FileReader;
    class MockFileReader {
      onload = null;
      readAsText() {
        this.result = jsonStr;
        if (this.onload) {
          this.onload({ target: { result: jsonStr } });
        }
      }
    }
    window.FileReader = MockFileReader;
    wrapper.vm.handleFileUpload(event);
    await nextTick();
    expect(wrapper.vm.nodes).toEqual(mockFlow.nodes);
    expect(wrapper.vm.edges).toEqual(mockFlow.edges);
    window.FileReader = originalFileReader;
  });

  it('ignores handleKeyDown when dialog is open or loading', () => {
    const undoSpy = vi.spyOn(wrapper.vm, 'undoChange');
    wrapper.vm.showDialog = true;
    const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'z' });
    wrapper.vm.handleKeyDown(event);
    expect(undoSpy).not.toHaveBeenCalled();
  });

  it('calls changeLanguage without error', () => {
    expect(() => wrapper.vm.changeLanguage('fr')).not.toThrow();
  });

  it('calls updateEdge when handleEdgeUpdate is triggered', () => {
    const edge = { id: 'edge1', source: 'a', target: 'b' };
    const connection = { source: 'a', target: 'c' };
  
    wrapper.vm.handleEdgeUpdate({ edge, connection });
  
    expect(updateEdgeMock).toHaveBeenCalledWith(edge, connection);
  });

  it('emits client_undo and resets loading in undoChange()', async () => {
    vi.useFakeTimers();
    wrapper.vm.isLoading = false;
  
    wrapper.vm.undoChange();
    expect(socket.emit).toHaveBeenCalledWith('client_undo', { roomId: 'test' });
  
    vi.advanceTimersByTime(5000);
    expect(wrapper.vm.isLoading).toBe(false);
    vi.useRealTimers();
  });

  it('emits client_redo and resets loading in redoChange()', async () => {
    vi.useFakeTimers();
    wrapper.vm.isLoading = false;
  
    wrapper.vm.redoChange();
    expect(socket.emit).toHaveBeenCalledWith('client_redo', { roomId: 'test' });
  
    vi.advanceTimersByTime(5000);
    expect(wrapper.vm.isLoading).toBe(false);
    vi.useRealTimers();
  });

  it('shows alert on invalid JSON during file upload', async () => {
    const file = new File(['{invalidJson'], 'test.json', { type: 'application/json' });
  
    const fakeReader = {
      readAsText: vi.fn(function () {
        this.onload({ target: { result: '{invalidJson' } });
      }),
      onload: null,
      onerror: null,
    };
  
    vi.spyOn(window, 'FileReader').mockImplementation(() => fakeReader);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  
    wrapper.vm.handleFileUpload({ target: { files: [file], value: '' } });
  
    expect(alertSpy).toHaveBeenCalled();
  });

  it('resets file input after file upload', async () => {
    const file = new File([JSON.stringify({ nodes: [], edges: [] })], 'test.json', { type: 'application/json' });
  
    const fakeReader = {
      readAsText: vi.fn(function () {
        this.onload({ target: { result: JSON.stringify({ nodes: [], edges: [] }) } });
      }),
      onload: null,
      onerror: null,
    };
  
    vi.spyOn(window, 'FileReader').mockImplementation(() => fakeReader);
  
    const input = { files: [file], value: '' };
    wrapper.vm.handleFileUpload({ target: input });
    expect(input.value).toBe('');
  });

  it('sets node to editing=true and adds label watcher on node double click', async () => {
    const testNode = {
      id: 'n1',
      data: { label: 'Original', editing: false }
    };
    expect(nodeDoubleClickHandler).toBeDefined();
    nodeDoubleClickHandler({ node: testNode });
  
    expect(testNode.data.editing).toBe(true);
  });

  it('sets edge to editing=true on edge double click', () => {
    const testEdge = {
      id: 'e1',
      data: undefined
    };
  
    expect(edgeDoubleClickHandler).toBeDefined();
    edgeDoubleClickHandler({ edge: testEdge });
  
    expect(testEdge.data.editing).toBe(true);
  });

  it('handles Sidebar events properly', async () => {
    wrapper.vm.showHelp = { openHelp: vi.fn() };
  
    const spyJson = vi.spyOn(wrapper.vm, 'exportToJson');
    const spyImg = vi.spyOn(wrapper.vm, 'exportToImage');
    const spyPdf = vi.spyOn(wrapper.vm, 'exportToPdf');
    const spyLang = vi.spyOn(wrapper.vm, 'changeLanguage');
    const spyHelp = vi.spyOn(wrapper.vm.showHelp, 'openHelp');  
    const spyOpen = vi.spyOn(wrapper.vm, 'openFileDialog');
  
    // Call methods directly, simulating event bindings
    wrapper.vm.exportToJson();
    wrapper.vm.exportToImage();
    wrapper.vm.exportToPdf();
    wrapper.vm.changeLanguage('fr');
    wrapper.vm.toggleHelp();
    wrapper.vm.openFileDialog();
  
    await nextTick();
  
    expect(spyJson).toHaveBeenCalled();
    expect(spyImg).toHaveBeenCalled();
    expect(spyPdf).toHaveBeenCalled();
    expect(spyLang).toHaveBeenCalledWith('fr');
    expect(spyHelp).toHaveBeenCalled();
    expect(spyOpen).toHaveBeenCalled();
  });

  it('correctly computes useAlternativeLayout based on window width', async () => {
    wrapper.vm.windowWidth = 1000;
    await nextTick();
    expect(wrapper.vm.useAlternativeLayout).toBe(true);
  
    wrapper.vm.windowWidth = 1300;
    await nextTick();
    expect(wrapper.vm.useAlternativeLayout).toBe(false);
  });

  it('shows default error message when code is not ROOM_AT_CAPACITY', async () => {
    wrapper.vm.store.getRoomFullErrorData = {
      code: 'UNKNOWN_ERROR',
      roomId: 'abc',
      capacity: 3
    };
    wrapper.vm.showRoomFullError = true;
    await nextTick();
    expect(wrapper.vm.formattedRoomFullError).toBe('roomStatus.generalError');
  });

  it('reacts to window resize by updating windowWidth', async () => {
    wrapper.vm.windowWidth = 800;
    global.innerWidth = 1200;
    window.dispatchEvent(new Event('resize'));
    await nextTick();
    expect(wrapper.vm.windowWidth).toBe(1200);
  });
  
  it('calls leaveRoom when destroyed', () => {
    const leaveSpy = vi.spyOn(wrapper.vm.store, 'leaveRoom');
    wrapper.unmount();
    expect(leaveSpy).toHaveBeenCalled();
  });

  it('logs error if file reading fails', async () => {
    const file = new File(['{}'], 'bad.json', { type: 'application/json' });
    const fakeReader = {
      readAsText: vi.fn(function () {
        this.onerror({ target: { error: 'Read error' } });
      }),
      onload: null,
      onerror: null,
    };
    vi.spyOn(window, 'FileReader').mockImplementation(() => fakeReader);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    wrapper.vm.handleFileUpload({ target: { files: [file], value: '' } });
    expect(errorSpy).toHaveBeenCalled();
  });
});
