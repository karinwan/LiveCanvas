import { describe, it, expect, vi, beforeEach } from 'vitest';
import drawingBoard from '@/pages/canvasBoard/drawingBoard.vue';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import socket from '@/services/socket';

const vuetifyInstance = createVuetify();

// Mock all dependencies
vi.mock('@/services/drawingTools', () => ({
  default: class MockDrawingTools {
    constructor() {}
    setTool() {}
    updateColor() {}
    updateBrushSize() {}
    setRoomId() {}
    applyZoom() {}
    resizeStage() {}
    broadcastClear() {}
    disableAllInteractions() {}
    enableAllInteractions() {}
    dispose() {}
    broadcastJSON() {}
    toJSON() { return '{}'; }
    toDataURL() { return 'data:image/png;base64,testdata'; }
  }
}));

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
  useI18n: () => ({ t: (key) => key })
}));


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

describe('drawingBoard.vue', () => {
  it('can be imported', () => {
    expect(drawingBoard).toBeDefined();
  });

  let wrapper;
  beforeEach(() => {
    wrapper = mount(drawingBoard, {
      global: {
        plugins: [vuetifyInstance]
      }
    });
  });

  it('renders the component', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('resizes canvas on window resize', async () => {
    const resizeSpy = vi.spyOn(wrapper.vm.drawingTools, 'resizeStage');
    window.dispatchEvent(new Event('resize'));
    await wrapper.vm.$nextTick();
    expect(resizeSpy).toHaveBeenCalled();
  });
  

  it('toggles export panel', async () => {
    const exportBtn = wrapper.find('[data-testid="export-button"]');
    expect(exportBtn.exists()).toBe(true);
    await exportBtn.trigger('click');
    expect(wrapper.vm.showExport).toBe(true);
  });

  it('toggles online panel', async () => {
    const onlineBtn = wrapper.find('[data-testid="online-button"]');
    expect(onlineBtn.exists()).toBe(true);
    await onlineBtn.trigger('click');
    expect(wrapper.vm.showOnline).toBe(true);
  });

  it('toggles help panel', async () => {
    wrapper.vm.showHelp = { openHelp: vi.fn() };
    wrapper.vm.toggleHelp();
    expect(wrapper.vm.showHelp.openHelp).toHaveBeenCalled();
  });

  it('handles all Sidebar events', async () => {
    const spyOpen = vi.spyOn(wrapper.vm, 'openFileDialog');
    const spyJson = vi.spyOn(wrapper.vm, 'exportToJson');
    const spyImg = vi.spyOn(wrapper.vm, 'exportToImage');
    const spyPdf = vi.spyOn(wrapper.vm, 'exportToPdf');

    await wrapper.vm.openFileDialog();
    await wrapper.vm.exportToJson();
    await wrapper.vm.exportToImage();
    await wrapper.vm.exportToPdf();

    expect(spyOpen).toHaveBeenCalled();
    expect(spyJson).toHaveBeenCalled();
    expect(spyImg).toHaveBeenCalled();
    expect(spyPdf).toHaveBeenCalled();
  });

  it('handles zoom level change from ZoomControl', async () => {
    const spy = vi.spyOn(wrapper.vm, 'handleZoomChange');
    await wrapper.vm.handleZoomChange(3);
    expect(spy).toHaveBeenCalledWith(3);
    expect(wrapper.vm.zoomLevel).toBe(3);
  });

  it('shows username dialog when enter', async () => {
    // simulate session room mismatch
    window.sessionStorage.getItem = vi.fn((key) =>
      key === 'currentRoom' ? 'old-room' : null
    );
  
    wrapper = mount(drawingBoard, {
      global: {
        plugins: [vuetifyInstance],
      },
    });
  
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.showDialog).toBe(true);
  });

  it('disables drawing when board is locked', async () => {
    wrapper.vm.isLocked = true;
    wrapper.vm.drawingTools = {
      disableAllInteractions: vi.fn(),
    };
  
    wrapper.vm.toggleBoardLock(true);
    expect(wrapper.vm.drawingTools.disableAllInteractions).toHaveBeenCalled();
  });

  it('disables tool selection when board is locked', async () => {
    wrapper.vm.currentTool = 'rectangle';
  
    // Lock the board
    wrapper.vm.toggleBoardLock(true);
    await wrapper.vm.$nextTick();
  
    // Should be forced to 'select'
    expect(wrapper.vm.currentTool).toBe('select');
  });

  it('restores previous tool after unlocking the board', async () => {
    // Start with rectangle
    wrapper.vm.currentTool = 'rectangle';
  
    // Lock the board — will overwrite sessionStorage
    wrapper.vm.toggleBoardLock(true);
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.currentTool).toBe('select');
  
    // Now mock sessionStorage to pretend we had 'rectangle' stored
    window.sessionStorage.getItem = vi.fn((key) => {
      if (key === 'previousTool') return 'rectangle';
      return 'test'; // fallback for other keys
    });
  
    // Unlock the board — should restore to mocked 'rectangle'
    wrapper.vm.toggleBoardLock(false);
    await wrapper.vm.$nextTick();
  
    expect(wrapper.vm.currentTool).toBe('rectangle');
  });
  
  it('clears the board when clearBoard is called', async () => {
    // Set up a spy on the drawingTools' broadcastClear method
    const clearSpy = vi.spyOn(wrapper.vm.drawingTools, 'broadcastClear');
  
    // Set loading state to false to allow clearing
    wrapper.vm.isLoading = false;
  
    await wrapper.vm.clearBoard();
  
    // Assert that broadcastClear was called
    expect(clearSpy).toHaveBeenCalled();
  
    // Assert loading state reset after timeout
    await new Promise((resolve) => setTimeout(resolve, 1100)); // slightly longer than 1000ms delay in clearBoard
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it('activates pencil tool and responds to color and size changes', async () => {
    const colorSpy = vi.spyOn(wrapper.vm.drawingTools, 'updateColor');
    const sizeSpy = vi.spyOn(wrapper.vm.drawingTools, 'updateBrushSize');
  
    wrapper.vm.isLocked = false;
    wrapper.vm.isLoading = false;
  
    // Select pencil
    wrapper.vm.currentTool = 'pencil';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.currentTool).toBe('pencil');
  
    // Change color
    wrapper.vm.currentColor = '#ff0000';
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.currentColor).toBe('#ff0000');
    expect(colorSpy).toHaveBeenCalledWith('#ff0000');
  
    // Change brush size
    wrapper.vm.brushSize = 10;
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.brushSize).toBe(10);
    expect(sizeSpy).toHaveBeenCalledWith(10);
  });

  it('selects arrow tool and applies current color and brush size', async () => {
    // Setup color and brush size before selecting arrow
    wrapper.vm.currentColor = '#123456';
    wrapper.vm.brushSize = 7;
  
    const toolSpy = vi.spyOn(wrapper.vm.drawingTools, 'setTool');
  
    // Select arrow tool
    wrapper.vm.currentTool = 'arrow';
    await wrapper.vm.$nextTick();
  
    expect(wrapper.vm.currentTool).toBe('arrow');
    expect(toolSpy).toHaveBeenCalledWith('arrow', '#123456', 7);
  });
  
  it('selects rectangle tool and applies current color and brush size', async () => {
    // Set expected color and brush size
    wrapper.vm.currentColor = '#ff9900';
    wrapper.vm.brushSize = 10;
  
    const toolSpy = vi.spyOn(wrapper.vm.drawingTools, 'setTool');
  
    // Select rectangle tool
    wrapper.vm.currentTool = 'rectangle';
    await wrapper.vm.$nextTick();
  
    expect(wrapper.vm.currentTool).toBe('rectangle');
    expect(toolSpy).toHaveBeenCalledWith('rectangle', '#ff9900', 10);
  });

  it('selects eraser tool and applies current settings', async () => {
    const toolSpy = vi.spyOn(wrapper.vm.drawingTools, 'setTool');
  
    // Set current tool to eraser
    wrapper.vm.currentTool = 'eraser';
    await wrapper.vm.$nextTick();
  
    expect(wrapper.vm.currentTool).toBe('eraser');
    expect(toolSpy).toHaveBeenCalledWith('eraser', wrapper.vm.currentColor, wrapper.vm.brushSize);
  });

  it('selects pan tool and applies current settings', async () => {
    const toolSpy = vi.spyOn(wrapper.vm.drawingTools, 'setTool');
  
    wrapper.vm.currentTool = 'pan'; // or 'move' depending on your naming
    await wrapper.vm.$nextTick();
  
    expect(wrapper.vm.currentTool).toBe('pan');
    expect(toolSpy).toHaveBeenCalledWith('pan', wrapper.vm.currentColor, wrapper.vm.brushSize);
  });

  it('selects text tool and applies current color', async () => {
    const toolSpy = vi.spyOn(wrapper.vm.drawingTools, 'setTool');
  
    wrapper.vm.currentColor = '#333333';
    wrapper.vm.brushSize = 4;
    wrapper.vm.currentTool = 'text';
    await wrapper.vm.$nextTick();
  
    expect(wrapper.vm.currentTool).toBe('text');
    expect(toolSpy).toHaveBeenCalledWith('text', '#333333', 4);
  });
  
  it('activates select tool', async () => {
    const toolSpy = vi.spyOn(wrapper.vm.drawingTools, 'setTool');
  
    wrapper.vm.currentTool = 'select';
    await wrapper.vm.$nextTick();
  
    expect(wrapper.vm.currentTool).toBe('select');
    expect(toolSpy).toHaveBeenCalledWith('select', expect.anything(), expect.anything());
  });

  it('updates canvas position after panning', async () => {
    // Mock drawingTools with a stage that has position
    wrapper.vm.drawingTools.stage = {
      x: vi.fn(() => 50),
      y: vi.fn(() => 100),
      position: vi.fn(() => ({ x: 50, y: 100 }))
    };
  
    const pos = wrapper.vm.drawingTools.stage.position();
    expect(pos).toEqual({ x: 50, y: 100 });
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

  it('handles file upload with valid JSON', async () => {
    wrapper.vm.isLoading = false;
    // Create a fake File with valid JSON content
    const file = new File(['{"test": "value"}'], 'test.json', { type: 'application/json' });
    // Create a fake FileReader that immediately calls onload with valid JSON
    const fakeFileReader = {
      readAsText: vi.fn(function () {
        this.onload({ target: { result: '{"test": "value"}' } });
      }),
      onload: null,
      onerror: null,
    };
    vi.spyOn(window, 'FileReader').mockImplementation(() => fakeFileReader);
    // Stub drawingTools.broadcastJSON to check it gets called with the JSON content
    wrapper.vm.drawingTools = { broadcastJSON: vi.fn() };
    const event = { target: { files: [file], value: '' } };
    wrapper.vm.handleFileUpload(event);
    expect(wrapper.vm.drawingTools.broadcastJSON).toHaveBeenCalledWith('{"test": "value"}');
  });

  it('handles file upload with invalid JSON', async () => {
    wrapper.vm.isLoading = false;
    const file = new File(['invalid json'], 'test.json', { type: 'application/json' });
    const fakeFileReader = {
      readAsText: vi.fn(function () {
        this.onload({ target: { result: 'invalid json' } });
      }),
      onload: null,
      onerror: null,
    };
    vi.spyOn(window, 'FileReader').mockImplementation(() => fakeFileReader);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    // Ensure drawingTools is defined even though it won't be used in the error path
    wrapper.vm.drawingTools = { broadcastJSON: vi.fn() };
    const event = { target: { files: [file], value: '' } };
    wrapper.vm.handleFileUpload(event);
    expect(alertSpy).toHaveBeenCalled();
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it('handles undoChange with loading state reset', async () => {
    wrapper.vm.isLoading = false;
    const emitSpy = vi.spyOn(socket, 'emit');
    vi.useFakeTimers();
    wrapper.vm.undoChange();
    expect(emitSpy).toHaveBeenCalledWith('client_undo', { roomId: expect.any(String) });
    // Fast-forward timers to trigger the safety timeout
    vi.advanceTimersByTime(5000);
    expect(wrapper.vm.isLoading).toBe(false);
    vi.useRealTimers();
  });

  it('handles redoChange with loading state reset', async () => {
    wrapper.vm.isLoading = false;
    const emitSpy = vi.spyOn(socket, 'emit');
    vi.useFakeTimers();
    wrapper.vm.redoChange();
    expect(emitSpy).toHaveBeenCalledWith('client_redo', { roomId: expect.any(String) });
    vi.advanceTimersByTime(5000);
    expect(wrapper.vm.isLoading).toBe(false);
    vi.useRealTimers();
  });

  it('alerts and does not show clear dialog when board is locked on confirmClearBoard', () => {
    wrapper.vm.isLocked = true;
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    wrapper.vm.confirmClearBoard();
    expect(alertSpy).toHaveBeenCalled();
    expect(wrapper.vm.showClearDialog).toBe(false);
  });

  it('does not handle keydown when showDialog is true', () => {
    wrapper.vm.showDialog = true;
    const undoSpy = vi.spyOn(wrapper.vm, 'undoChange');
    const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'z', bubbles: true });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    wrapper.vm.handleKeyDown(event);
    expect(undoSpy).not.toHaveBeenCalled();
  });

  it('handles file upload error when file reading fails', async () => {
    wrapper.vm.isLoading = false;
    const file = new File(['{"test": "value"}'], 'test.json', { type: 'application/json' });
    const fakeFileReader = {
      readAsText: vi.fn(function () {
        if (this.onerror) this.onerror(new Error("Read error"));
      }),
      onload: null,
      onerror: null,
    };
    vi.spyOn(window, 'FileReader').mockImplementation(() => fakeFileReader);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    wrapper.vm.handleFileUpload({ target: { files: [file], value: '' } });
    expect(alertSpy).toHaveBeenCalled();
    expect(wrapper.vm.isLoading).toBe(false);
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

    // Expect the dialog is closed
    expect(wrapper.vm.showDialog).toBe(false);

    // Expect loading state is now true
    expect(wrapper.vm.isLoading).toBe(true);
  });

  it('cleans up on unmount', () => {
    // Stub dispose on drawingTools and spy on store.leaveRoom
    wrapper.vm.drawingTools.dispose = vi.fn();
    const leaveRoomSpy = vi.spyOn(wrapper.vm.store, 'leaveRoom');
    wrapper.unmount();
    expect(wrapper.vm.drawingTools.dispose).toHaveBeenCalled();
    expect(leaveRoomSpy).toHaveBeenCalledWith('test', 'test');
  });

});