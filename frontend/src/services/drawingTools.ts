import Konva from 'konva';
import socket from '@/services/socket';

/**
 * Service class that manages drawing tools functionality using Konva
 * with support for complete erasing and WebSocket collaboration
 */
export default class DrawingTools {
  private stage: Konva.Stage | null = null;
  private layer: Konva.Layer | null = null;
  private isPaint: boolean = false;
  private isErasing: boolean = false;
  private currentLine: Konva.Line | null = null;
  private previousBrushColor: string = '#000000';
  private previousBrushWidth: number = 5;
  private mode: string = 'pencil';
  private eraserRadius: number = 10;
  private roomId: string = '';
  private isReceivingData: boolean = false; // Flag to prevent infinite loops
  private isSyncingCanvas: boolean = false; // Flag to indicate if canvas is being synced
  private syncInterval: ReturnType<typeof setInterval> | null = null; // Periodic sync interval
  
  // Text editing variables
  private currentTextNode: Konva.Text | null = null;
  private textEditingEnabled: boolean = false;
  private textEditArea: HTMLTextAreaElement | null = null;
  private defaultFontSize: number = 20; // Increased default font size
  private isNewTextNode: boolean = false; // Flag to track if text node is new
  private didEraseAnyNode: boolean = false;

  // Add new class properties
  private isPanning: boolean = false;
  private lastPointerPosition: { x: number, y: number } | null = null;
  private startPoint: { x: number, y: number } | null = null;
  private currentArrow: Konva.Arrow | null = null;
  private currentRect: Konva.Rect | null = null;
  private _previousMode: string = 'pencil'; // Store previous mode for restoration after unlock

  /**
   * Initialize with Konva stage
   * @param containerId - ID of the container element
   * @param width - Canvas width
   * @param height - Canvas height
   * @param roomId - Current room ID for WebSocket communication
   */
  constructor(containerId: string = '', width: number = 0, height: number = 0, roomId: string = '') {
    this.roomId = roomId;
    if (containerId && width && height) {
      this.initializeStage(containerId, width, height);
    }
    this.setupSocketListeners();
    this.requestInitialState();
    this.startPeriodicSync();
    this.createTextEditArea();
    
    // Force proper initialization
    setTimeout(() => {
      this.isInitialized = true;
      console.log('DrawingTools fully initialized');
      
      // Force event rebinding
      if (this.mode === 'text') {
        // Re-initialize the text tool if it's already selected
        this.setTool('select', this.previousBrushColor, this.previousBrushWidth);
        this.setTool('text', this.previousBrushColor, this.previousBrushWidth);
      }
    }, 500); // Short delay to ensure everything is ready
  }
  
  /**
   * Create text area for editing
   */
  private createTextEditArea(): void {
    // Create textarea for text editing if it doesn't exist yet
    if (!this.textEditArea) {
      this.textEditArea = document.createElement('textarea');
      this.textEditArea.style.position = 'absolute';
      this.textEditArea.style.padding = '5px';
      this.textEditArea.style.margin = '0px';
      this.textEditArea.style.border = '1px solid #0088ff';
      this.textEditArea.style.background = 'white';
      this.textEditArea.style.outline = 'none';
      this.textEditArea.style.resize = 'none';
      this.textEditArea.style.minWidth = '120px';
      this.textEditArea.style.minHeight = '40px';
      this.textEditArea.style.borderRadius = '3px';
      this.textEditArea.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      this.textEditArea.style.fontFamily = 'Arial';
      this.textEditArea.style.overflow = 'hidden';
      this.textEditArea.style.zIndex = '10000'; // Ensure it's above everything
      this.textEditArea.style.display = 'none';
      
      // Add to document
      document.body.appendChild(this.textEditArea);
      
      // Handle blur event to finish editing
      this.textEditArea.addEventListener('blur', () => {
        console.log('Text area blur event');
        this.finishTextEditing();
      });
      
      // Handle keydown events
      this.textEditArea.addEventListener('keydown', (e) => {
        // Prevent propagation to canvas
        e.stopPropagation();
        
        // Enter key finishes editing
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          console.log('Enter key pressed');
          this.finishTextEditing();
        }
      });
    }
  }

  /**
   * Set room ID
   */
  setRoomId(roomId: string): void {
    if (this.roomId !== roomId) {
      this.roomId = roomId;
      this.requestInitialState();
    }
  }

  /**
   * Start periodic full sync
   */
  private startPeriodicSync(): void {
    // Perform a full sync every 30 seconds to ensure all clients are in sync
    this.syncInterval = setInterval(() => {
      if (!this.isReceivingData && !this.isSyncingCanvas && this.roomId) {
        console.log('Performing periodic full sync');
        this.syncCanvasAsJson();
      }
    }, 30000); // 30 seconds
  }

  /**
   * Initialize Konva stage
   */
  initializeStage(containerId: string, width: number, height: number): void {
    // Create Konva stage
    this.stage = new Konva.Stage({
      container: containerId,
      width: width,
      height: height
    });

    // Create main drawing layer
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    // Set up event listeners
    this.setupEventListeners();
  }
  
  /**
   * Request initial canvas state
   */
  private requestInitialState(): void {
    if (!this.roomId) return;
    
    console.log(`Requesting initial canvas state for room: ${this.roomId}`);
    
    // Request initial canvas state
    socket.emit('join_room', { 
      room: this.roomId, 
      username: sessionStorage.getItem('currentUser')
    });
  }
  
  /**
   * Set up WebSocket listeners for collaboration
   */
  private setupSocketListeners(): void {
    // Listen for drawing data from server (for backward compatibility)
    socket.on('server_drawing', (data) => {
      if (data.roomId !== this.roomId) return;
      
      try {
        this.isReceivingData = true;
        
        // Create a new line from the received data
        if (data.lineData) {
          const newLine = new Konva.Line({
            points: data.lineData.points,
            stroke: data.lineData.stroke,
            strokeWidth: data.lineData.strokeWidth,
            lineCap: 'round',
            lineJoin: 'round',
            draggable: this.mode === 'select',
            name: 'drawable'
          });
          
          this.layer?.add(newLine);
          this.layer?.batchDraw();
        }
        
        // Handle text data
        if (data.textData) {
          const newText = new Konva.Text({
            x: data.textData.x,
            y: data.textData.y,
            text: data.textData.text,
            fontSize: data.textData.fontSize,
            fontFamily: data.textData.fontFamily || 'Arial',
            fill: data.textData.fill,
            padding: 5,
            draggable: this.mode === 'select',
            name: 'text'
          });
          
          this.layer?.add(newText);
          this.layer?.batchDraw();
        }

        // Handle arrow data
        if (data.arrowData) {
          const newArrow = new Konva.Arrow({
            points: data.arrowData.points,
            pointerLength: data.arrowData.pointerLength,
            pointerWidth: data.arrowData.pointerWidth,
            fill: data.arrowData.fill,
            stroke: data.arrowData.stroke,
            strokeWidth: data.arrowData.strokeWidth,
            lineCap: 'round',
            lineJoin: 'round',
            draggable: this.mode === 'select',
            name: 'drawable'
          });
          
          this.layer?.add(newArrow);
          this.layer?.batchDraw();
        }

        // Handle rectangle data
        if (data.rectData) {
          const newRect = new Konva.Rect({
            x: data.rectData.x,
            y: data.rectData.y,
            width: data.rectData.width,
            height: data.rectData.height,
            fill: data.rectData.fill,
            stroke: data.rectData.stroke,
            strokeWidth: data.rectData.strokeWidth,
            draggable: this.mode === 'select',
            name: 'drawable'
          });
          
          this.layer?.add(newRect);
          this.layer?.batchDraw();
        }
      } catch (error) {
        console.error('Error creating object from server data:', error);
      } finally {
        this.isReceivingData = false;
      }
    });
    
    // Listen for canvas clear events
    socket.on('client_canvasClear', (data) => {
      if (data.roomId !== this.roomId) return;
      this.isReceivingData = true;
      this.clearCanvas(false); // Don't broadcast again to avoid loops
      this.isReceivingData = false;
      console.log('Canvas cleared by server');
    });
    
    // Listen for uploaded JSON content (compatibility)
    socket.on('uploaded_json_content', (data) => {
      if (data.roomId !== this.roomId) return;
      
      try {
        this.isReceivingData = true;
        this.isSyncingCanvas = true;
        
        console.log('Received JSON content from server, updating canvas');
        
        // Load the JSON content - ensure proper string conversion
        if (data.jsonContent) {
          // Clear canvas first
          this.clearCanvas(false);
          
          // Convert to string if needed
          const jsonString = typeof data.jsonContent === 'string' 
            ? data.jsonContent 
            : JSON.stringify(data.jsonContent);
          
          this.loadFromJSON(jsonString, false);
          console.log('Canvas updated with uploaded JSON content');
        }
      } catch (error) {
        console.error('Error loading JSON content:', error);
      } finally {
        this.isReceivingData = false;
        this.isSyncingCanvas = false;
      }
    });
    
    // Add new listener for canvas state updates
    socket.on('canvas_state_update', (data) => {
      if (data.roomId !== this.roomId) return;
      
      try {
        console.log('Received canvas state update');
        this.loadCanvasState(data.canvasState);
      } catch (error) {
        console.error('Error applying canvas state update:', error);
      }
    });
  }

  /**
   * Set up stage event listeners
   */
  private setupEventListeners(): void {
    if (!this.stage) return;

    // Clear any existing event listeners
    this.stage.off('mousedown touchstart mousemove touchmove mouseup touchend');

    // Mouse down event
    this.stage.on('mousedown touchstart', (e) => {
      if (this.isSyncingCanvas) return; // If syncing, disable interaction
      
      // If we're already editing text, finish it first
      if (this.textEditingEnabled) {
        this.finishTextEditing();
        return;
      }
      
      if (this.mode === 'pencil') {
        this.handlePencilDown(e);
      } else if (this.mode === 'eraser') {
        this.handleEraserDown(e);
      } else if (this.mode === 'text') {
        this.handleTextDown(e);
      } else if (this.mode === 'arrow') {
        this.handleArrowDown(e);
      } else if (this.mode === 'rectangle') {
        this.handleRectangleDown(e);
      } else if (this.mode === 'pan') {
        this.handlePanDown(e);
      }
    });

    // Mouse move event
    this.stage.on('mousemove touchmove', (e) => {
      if (this.isSyncingCanvas) return;
      
      if (this.mode === 'pencil') {
        this.handlePencilMove(e);
      } else if (this.mode === 'eraser') {
        this.handleEraserMove(e);
      } else if (this.mode === 'arrow') {
        this.handleArrowMove(e);
      } else if (this.mode === 'rectangle') {
        this.handleRectangleMove(e);
      } else if (this.mode === 'pan') {
        this.handlePanMove(e);
      }
    });

    // Mouse up event
    this.stage.on('mouseup touchend', () => {
      if (this.isSyncingCanvas) return; // If syncing, disable interaction
      
      if (this.mode === 'pencil') {
        this.handlePencilUp();
      } else if (this.mode === 'eraser') {
        this.handleEraserUp();
      } else if (this.mode === 'arrow') {
        this.handleArrowUp();
      } else if (this.mode === 'rectangle') {
        this.handleRectangleUp();
      } else if (this.mode === 'pan') {
        this.handlePanUp();
      }
    });

    // Mouse enter/leave events
    this.stage.on('mouseleave', () => {
      this.isPaint = false;
      this.isErasing = false;
    });
    
    // Log to confirm event handlers are attached
    console.log('Event listeners setup completed, mode:', this.mode);
  }

  /**
   * Handle text tool mouse down event - prevent default to keep focus
   */
  private handleTextDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    // Prevent default browser behavior that might steal focus
    e.evt.preventDefault();
    
    console.log('Text tool handler called');
    
    // Prevent multiple text nodes from being created in the same spot
    if (this.textEditingEnabled) {
      return;
    }
    
    const rawPos = this.stage?.getPointerPosition();
    if (!rawPos) return;
    const pos = {
      x: (rawPos.x - this.stage.x()) / this.stage.scaleX(),
      y: (rawPos.y - this.stage.y()) / this.stage.scaleY()
    };
    
    // If we clicked on an existing text, edit it
    if (e.target instanceof Konva.Text) {
      console.log('Editing existing text');
      this.startTextEditing(e.target);
      this.isNewTextNode = false;
      return;
    }
    
    console.log('Creating new text at', pos.x, pos.y);
    
    // Create a simple text node - initially empty
    const text = new Konva.Text({
      x: pos.x,
      y: pos.y,
      text: '',  // Start with empty text
      fontSize: this.defaultFontSize,
      fontFamily: 'Arial',
      fill: this.previousBrushColor,
      padding: 5,
      draggable: false,
      name: 'text'
    });
    
    // Add to layer
    this.layer?.add(text);
    this.layer?.batchDraw();
    
    // Mark as new text node
    this.isNewTextNode = true;
    
    // Start editing immediately
    this.startTextEditing(text);
  }
  
  /**
   * Start editing text - fixed to prevent immediate blur
   */
  private startTextEditing(textNode: Konva.Text): void {
    if (!this.textEditArea || !this.stage) return;
    
    console.log('Starting text edit for', textNode.text());
    
    // Set a flag to ignore the first blur event
    this.justCreatedText = true;
    
    // End any current editing session
    if (this.textEditingEnabled && this.currentTextNode) {
      this.finishTextEditing();
    }
    
    // Store the current text node
    this.currentTextNode = textNode;
    
    // Calculate positioning...
    const stageBox = this.stage.container().getBoundingClientRect();
    const scale = this.stage.scaleX();
    const absPos = textNode.absolutePosition();
    const areaX = stageBox.left + absPos.x * scale;
    const areaY = stageBox.top + absPos.y * scale;
    
    // Set up textarea
    this.textEditArea.value = this.isNewTextNode ? '' : textNode.text();
    this.textEditArea.style.position = 'absolute';
    this.textEditArea.style.top = `${areaY}px`;
    this.textEditArea.style.left = `${areaX}px`;
    this.textEditArea.style.width = `${Math.max(200, (textNode.width() + 20) * scale)}px`;
    this.textEditArea.style.height = `${Math.max(50, (textNode.height() + 10) * scale)}px`;
    this.textEditArea.style.fontSize = `${textNode.fontSize() * scale}px`;
    this.textEditArea.style.color = textNode.fill() || '#000000';
    this.textEditArea.style.display = 'block';
    
    // Hide the text node during editing
    textNode.visible(false);
    this.layer?.batchDraw();
    
    // Set editing flag
    this.textEditingEnabled = true;
    
    // Focus with delay to ensure proper focus
    setTimeout(() => {
      if (this.textEditArea) {
        this.textEditArea.focus();
        this.textEditArea.select();
        
        // Reset the flag after a short delay
        setTimeout(() => {
          this.justCreatedText = false;
        }, 300);
        
        console.log('Textarea focused and text selected');
      }
    }, 50);
  }

  private finishTextEditing(): void {
    if (!this.textEditingEnabled || !this.textEditArea || !this.currentTextNode) {
      return;
    }
    
    console.log('Finishing text editing');
    
    try {
      // Get the edited text
      const newText = this.textEditArea.value;
      
      // If text is empty, remove the node
      if (newText.trim() === '') {
        console.log('Removing empty text node');
        this.currentTextNode.destroy();
      } else {
        // Update the text node with the new text
        console.log('Updating text to:', newText);
        this.currentTextNode.text(newText);
        this.currentTextNode.visible(true);
        
        // Make it draggable in select mode
        this.currentTextNode.draggable(this.mode === 'select');
        
        // Broadcast the text change
        if (!this.isReceivingData) {
          this.broadcastTextNode(this.currentTextNode);
          console.log('Text change broadcasted');
        }
      }
      
      // Hide the textarea
      this.textEditArea.style.display = 'none';
      this.textEditArea.value = '';
      
      // Reset editing state
      this.textEditingEnabled = false;
      this.currentTextNode = null;
      this.isNewTextNode = false;
      
      // Refresh the layer
      this.layer?.batchDraw();
      
      console.log('Text editing finished');
    } catch (error) {
      console.error('Error while finishing text editing:', error);
    }
  }
  /**
   * Broadcast text node to all users
   */
  private broadcastTextNode(textNode: Konva.Text): void {
    if (!this.roomId || this.isSyncingCanvas) return;
    
    // Create text data object
    const textData = {
      x: textNode.x(),
      y: textNode.y(),
      text: textNode.text(),
      fontSize: textNode.fontSize(),
      fontFamily: textNode.fontFamily(),
      fill: textNode.fill()
    };
    
    // Emit to server
    socket.emit('client_drawing', {
      roomId: this.roomId,
      textData: textData
    });
    
    // Send the complete canvas state after a short delay
    setTimeout(() => {
      this.sendCanvasState(false);
    }, 50);
    
  }
  /**
   * Handle pencil down event
   */
  private handlePencilDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    this.isPaint = true;
    const rawPos = this.stage?.getPointerPosition();
    if (!rawPos) return;
    const pos = {
      x: (rawPos.x - this.stage.x()) / this.stage.scaleX(),
      y: (rawPos.y - this.stage.y()) / this.stage.scaleY()
    };

    this.currentLine = new Konva.Line({
      stroke: this.previousBrushColor,
      strokeWidth: this.previousBrushWidth,
      globalCompositeOperation: 'source-over',
      lineCap: 'round',
      lineJoin: 'round',
      points: [pos.x, pos.y, pos.x, pos.y],
      name: 'drawable',
      draggable: false  // Will be draggable in select mode
    });

    this.layer?.add(this.currentLine);
    this.lastLine = this.currentLine;
  }

  /**
   * Handle pencil move event
   */
  private handlePencilMove(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!this.isPaint) return;
    
    // Prevent scrolling on touch devices
    e.evt.preventDefault();
    
    const rawPos2 = this.stage?.getPointerPosition();
    if (!rawPos2 || !this.currentLine) return;
    const pos2 = {
      x: (rawPos2.x - this.stage.x()) / this.stage.scaleX(),
      y: (rawPos2.y - this.stage.y()) / this.stage.scaleY()
    };

    // Add point to line
    const newPoints = this.currentLine.points().concat([pos2.x, pos2.y]);
    this.currentLine.points(newPoints);
    this.layer?.batchDraw();
  }

  /**
   * Handle pencil up event
   */
  private handlePencilUp(): void {
    this.isPaint = false;
    
    if (!this.currentLine) return;
    
    // If line has only start point, add a tiny segment to make it visible
    if (this.currentLine.points().length <= 4) {
      const points = this.currentLine.points();
      const x = points[0];
      const y = points[1];
      this.currentLine.points([x, y, x + 0.1, y + 0.1]);
    }
    
    // Send line data to server if we're not already receiving data
    if (!this.isReceivingData && this.roomId && !this.isSyncingCanvas) {
      // Extract the line data to send
      const lineData = {
        points: this.currentLine.points(),
        stroke: this.currentLine.stroke(),
        strokeWidth: this.currentLine.strokeWidth()
      };
      
      // Emit to server
      socket.emit('client_drawing', { 
        roomId: this.roomId, 
        lineData: lineData 
      });
      
      // Send the complete canvas state after a short delay
      // This ensures the line is added to all clients before sending the state
      setTimeout(() => {
        this.sendCanvasState(false);
      }, 50);
    }
    
    this.currentLine = null;
  }
  
  /**
   * Handle eraser down event
   */
  private handleEraserDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    this.isErasing = true;
    this.didEraseAnyNode = false;
    // Update eraser position and check for intersections
    this.updateEraserAndErase();
  }

  /**
   * Handle eraser move event
   */
  private handleEraserMove(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    // Prevent scrolling on touch devices
    e.evt.preventDefault();
    this.updateEraserAndErase();
  }

  /**
   * Update eraser and check for intersections - FIXED VERSION
   */
  private updateEraserAndErase(): void {
    if (!this.stage || !this.layer) return;
    
    // Get pointer position in layer coordinates - this is the key fix
    // Always use getRelativePointerPosition() for consistent coordinates
    const layerPos = this.layer.getRelativePointerPosition();
    if (!layerPos) return;
    
    // If erasing, check for collisions
    if (this.isErasing) {
      // Get all drawable objects
      const drawables = this.layer.find('.drawable, .text');
      let didErase = false;
  
      // Check each object
      drawables.forEach(node => {
        let shouldErase = false;
    
        if (node instanceof Konva.Line || node instanceof Konva.Arrow) {
          shouldErase = this.checkLineEraserCollision(node, layerPos.x, layerPos.y);
        } else if (node instanceof Konva.Rect || node instanceof Konva.Text) {
          // Use relativeTo param to get bounds in layer coordinates
          const rect = node.getClientRect({ relativeTo: this.layer });
      
          // Create eraser bounds
          const eraserLeft = layerPos.x - this.eraserRadius;
          const eraserTop = layerPos.y - this.eraserRadius;
          const eraserWidth = this.eraserRadius * 2;
          const eraserHeight = this.eraserRadius * 2;
      
          // Check for rectangle overlap
          shouldErase = this.checkRectOverlap(
            eraserLeft, eraserTop, eraserWidth, eraserHeight,
            rect.x, rect.y, rect.width, rect.height
          );
        }
    
        if (shouldErase) {
          node.destroy();
          didErase = true;
        }
      });
  
      if (didErase) {
        this.layer.batchDraw();
        this.didEraseAnyNode = true;
    
        // Send canvas state after erasing
        if (!this.isReceivingData && !this.isSyncingCanvas) {
          this.sendCanvasState(false);
        }
      }
    }

    this.layer.batchDraw();
  }
  
  /**
   * Check if line or arrow intersects with eraser - FIXED VERSION
   */
  private checkLineEraserCollision(node: Konva.Line | Konva.Arrow, eraserX: number, eraserY: number): boolean {
    const points = node.points();
    const radius = this.eraserRadius;
    
    // Use getTransform instead of getAbsoluteTransform to stay in layer coordinates
    const tr = node.getTransform();
    
    // Check each point
    for (let i = 0; i < points.length; i += 2) {
      const localPoint = { x: points[i], y: points[i + 1] };
      // Transform to layer coordinates
      const transformedPoint = tr.point(localPoint);
      
      const dist = Math.sqrt(
        Math.pow(transformedPoint.x - eraserX, 2) + 
        Math.pow(transformedPoint.y - eraserY, 2)
      );
      
      if (dist <= radius) {
        return true;
      }
    }
    
    // Check line segments
    for (let i = 0; i < points.length - 2; i += 2) {
      const p1Local = { x: points[i], y: points[i + 1] };
      const p2Local = { x: points[i + 2], y: points[i + 3] };
      
      // Transform to layer coordinates
      const p1 = tr.point(p1Local);
      const p2 = tr.point(p2Local);
      
      if (this.lineSegmentIntersectsCircle(
        p1.x, p1.y, p2.x, p2.y, eraserX, eraserY, radius
      )) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if two rectangles overlap (rough collision detection)
   */
  private checkRectOverlap(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    return !(
      x1 > x2 + w2 ||
      x1 + w1 < x2 ||
      y1 > y2 + h2 ||
      y1 + h1 < y2
    );
  }
  
  /**
   * Check if a line segment intersects with a circle
   */
  private lineSegmentIntersectsCircle(
    x1: number, y1: number, 
    x2: number, y2: number, 
    cx: number, cy: number, 
    r: number
  ): boolean {
    // Calculate the square of the line segment length
    const lenSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (lenSq === 0) return false; // Line segment length is zero
    
    // Calculate dot product
    const dot = ((cx - x1) * (x2 - x1) + (cy - y1) * (y2 - y1)) / lenSq;
    
    // Find the closest point on the line segment to the circle center
    const closestX = x1 + dot * (x2 - x1);
    const closestY = y1 + dot * (y2 - y1);
    
    // Check if this point is on the line segment
    const onSegment = (dot >= 0 && dot <= 1);
    if (!onSegment) {
      // If not on segment, check distance from endpoints to circle center
      const dist1 = Math.sqrt((x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy));
      const dist2 = Math.sqrt((x2 - cx) * (x2 - cx) + (y2 - cy) * (y2 - cy));
      return Math.min(dist1, dist2) <= r;
    }
    
    // Calculate distance from closest point to circle center
    const dist = Math.sqrt((closestX - cx) * (closestX - cx) + (closestY - cy) * (closestY - cy));
    return dist <= r;
  }

  /**
   * Handle eraser up event
   */
  private handleEraserUp(): void {
    this.isErasing = false;
    
    // Only send state on mouse up if something was actually erased
    if (this.didEraseAnyNode && !this.isReceivingData && !this.isSyncingCanvas) {
      this.sendCanvasState(false);
    }
  }
  
  /**
   * Sync canvas as JSON and broadcast
   */
  syncCanvasAsJson(isSelectionAction: boolean = false): void {
    if (!this.roomId || this.isReceivingData || this.isSyncingCanvas) return;
    
    try {
      this.isSyncingCanvas = true;
      
      // Get canvas JSON
      const canvasState = this.toJSON();
      const jsonContent = JSON.parse(canvasState);
      
      // Use existing upload_json_content event to send
      socket.emit('upload_json_content', { 
        roomId: this.roomId,
        jsonContent: jsonContent,
        isSelectionAction: isSelectionAction // Flag for selection-related actions
      });
      
      console.log(`Canvas state synchronized as JSON (selection: ${isSelectionAction})`);
    } catch (error) {
      console.error('Error synchronizing canvas state:', error);
    } finally {
      this.isSyncingCanvas = false;
    }
  }

  /**
 * Handle pan down event
 */
  private handlePanDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    this.isPanning = true;
  this.stage!.container().style.cursor = 'grabbing';
  
  const pos = this.stage?.getPointerPosition();
  if (pos) {
    this.lastPointerPosition = pos;
  }
  }

  /**
 * Handle pan move event
 */
  private handlePanMove(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!this.isPanning || !this.lastPointerPosition) return;
  
    // Prevent scrolling on touch devices
    e.evt.preventDefault();
  
    const pos = this.stage?.getPointerPosition();
    if (!pos || !this.stage) return;
  
    // Calculate distance moved
    const dx = pos.x - this.lastPointerPosition.x;
    const dy = pos.y - this.lastPointerPosition.y;
  
    // Update stage position
    const newX = this.stage.x() + dx;
    const newY = this.stage.y() + dy;
  
    this.stage.position({ x: newX, y: newY });
    this.stage.batchDraw();
  
    // Update last position
    this.lastPointerPosition = pos;
  }

  /**
 * Handle pan up event
 */
  private handlePanUp(): void {
    this.isPanning = false;
    this.lastPointerPosition = null;
    if (this.stage) {
      this.stage.container().style.cursor = 'grab';
    }
  }


  /**
   * Resize the stage
   */
  resizeStage(width: number, height: number): void {
    if (!this.stage) return;
    
    this.stage.width(width);
    this.stage.height(height);
    this.stage.draw();
  }
  
  /**
   * Apply zoom to stage
   */
  applyZoom(scale: number): void {
    if (!this.stage) return;
    
    // Apply zoom transformation
    this.stage.scale({ x: scale, y: scale });
    this.stage.batchDraw();
  }

  /**
   * Set the active tool - Fixed initialization for text tool
   */
  setTool(tool: string, color: string, size: number): void {
    console.log(`Setting tool to ${tool}, color: ${color}, size: ${size}`);
    
    // If text is being edited, finish it when changing tools
    if (this.textEditingEnabled) {
      this.finishTextEditing();
    }
    
    // Store settings
    this.previousBrushColor = color;
    this.previousBrushWidth = size;
    
    // Always force tool change regardless of current mode
    this.mode = tool;
    
    if (!this.stage) return;
    
    // Reset flags
    this.isPaint = false;
    this.isErasing = false;
    this.isPanning = false;
    this.startPoint = null;
    
    // Update eraser size
    this.eraserRadius = size * 2;
    
    // Important: Reset event handlers to ensure correct behavior
    this.setupEventListeners();
    
    switch (tool) {
    case 'pencil':
      this.stage.container().style.cursor = 'crosshair';
      this.disableSelection();
      this.setAllObjectsDraggable(false);
      break;
      
    case 'eraser':
      this.stage.container().style.cursor = 'crosshair'; // Hide cursor, using circle indicator
      this.disableSelection();
      this.setAllObjectsDraggable(false);
      break;
      
    case 'text':
      this.stage.container().style.cursor = 'text';
      this.disableSelection();
      this.setAllObjectsDraggable(false);
      console.log('Text tool activated');
      break;
        
    case 'select':
      this.stage.container().style.cursor = 'move';
      this.enableSelection();
      this.setAllObjectsDraggable(true);
      break;

    case 'arrow':
      this.stage.container().style.cursor = 'crosshair';
      this.disableSelection();
      this.setAllObjectsDraggable(false);
      break;

    case 'rectangle':
      this.stage.container().style.cursor = 'crosshair';
      this.disableSelection();
      this.setAllObjectsDraggable(false);
      break;

    case 'pan':
      this.stage.container().style.cursor = 'grab';
      this.disableSelection();
      this.setAllObjectsDraggable(false);
      break;
      
    default:
      console.warn(`Tool '${tool}' not implemented`);
      break;
    }
    
    this.layer?.batchDraw();
  }
  
  /**
   * Set all objects draggable property
   */
  private setAllObjectsDraggable(draggable: boolean): void {
    if (!this.layer) return;
    
    // Find all drawable lines and text
    const objects = this.layer.find('.drawable, .text');
    
    // Set draggable property
    objects.forEach(node => {
      if (node instanceof Konva.Shape || node instanceof Konva.Text) {
        node.draggable(draggable);
      }
    });
  }

  /**
   * Enable selection mode
   */
  private enableSelection(): void {
    if (!this.stage) return;
    
    // Clear all current listeners to avoid duplications
    this.stage.off('click tap dragstart dragmove dragend dblclick.textEdit');
    
    // Set up selection behavior
    this.stage.on('click tap', (e) => {
      if (this.isSyncingCanvas) return;
      
      // If we're currently editing text, finish that first
      if (this.textEditingEnabled) {
        this.finishTextEditing();
        return;
      }
      
      // Check if we clicked on a text object to edit it
      if (e.target instanceof Konva.Text) {
        // Double-click on text starts editing
        if (e.evt.detail === 2) {
          console.log('Double-click on text in select mode');
          this.startTextEditing(e.target);
          e.cancelBubble = true;
          return;
        }
      }
      
      // Clicked on stage background
      if (e.target === this.stage) {
        return;
      }
      
      this.layer?.batchDraw();
    });
    
    // Drag event handling
    let isDragging = false;
    // Use nodeId string as key - this is the issue with the original code
    const originalPositions = new Map<string, {x: number, y: number}>(); 
    
    // Start dragging
    this.stage.on('dragstart', (e) => {
      if (this.isSyncingCanvas) return; // If syncing, disable interaction
      
      if (e.target === this.stage) return;
      const targetNode = e.target;
      
      // Check if target has a valid id
      const nodeId = targetNode.id();
      console.log('Drag start for node:', nodeId);
      
      isDragging = true;
      
      // Store starting position of the dragged node
      if (targetNode instanceof Konva.Shape || targetNode instanceof Konva.Text) {
        // Store using string ID to avoid reference issues
        originalPositions.set(nodeId, {
          x: targetNode.x(),
          y: targetNode.y()
        });
        console.log('Stored original position:', nodeId, originalPositions.get(nodeId));
      }
      
      // If we have transformer, store its nodes too
      if (this.transformer) {
        const nodes = this.transformer.nodes();
        console.log(`Storing ${nodes.length} transformer nodes`);
        nodes.forEach(node => {
          if (node instanceof Konva.Shape || node instanceof Konva.Text) {
            const id = node.id();
            originalPositions.set(id, {
              x: node.x(),
              y: node.y()
            });
          }
        });
      }
      
      this.layer?.batchDraw();
    });
    
    // Dragging
    this.stage.on('dragmove', (e) => {
      if (this.isSyncingCanvas || !isDragging) return;
      this.layer?.batchDraw();
    });
    
    // End dragging and send sync immediately
    this.stage.on('dragend', (e) => {
      if (this.isSyncingCanvas) return;
      
      if (!isDragging) return;
      
      // Get the dragged node
      const draggedNode = e.target;
      const nodeId = draggedNode.id();
      console.log('Drag ended for node:', nodeId);
      
      // Compare new positions with original positions
      let positionChanged = false;
      
      // First check the dragged node itself
      if (draggedNode instanceof Konva.Shape || draggedNode instanceof Konva.Text) {
        const originalDraggedPos = originalPositions.get(nodeId);
        console.log('Original position:', originalDraggedPos);
        console.log('New position:', { x: draggedNode.x(), y: draggedNode.y() });
        
        // Check if we have original position and if position has changed
        if (originalDraggedPos) {
          const dx = Math.abs(originalDraggedPos.x - draggedNode.x());
          const dy = Math.abs(originalDraggedPos.y - draggedNode.y());
          console.log(`Position delta: dx=${dx}, dy=${dy}`);
          
          if (dx > 0.5 || dy > 0.5) {
            positionChanged = true;
            console.log('Position changed detected on dragged node');
            
            // If the node is a text node, broadcast its new position
            if (draggedNode instanceof Konva.Text && !this.isReceivingData) {
              this.broadcastTextNode(draggedNode);
            }
          }
        } else {
          console.warn('No original position found for dragged node:', nodeId);
        }
      }
      
      // For safety, check all stored positions if something changed
      if (!positionChanged) {
        console.log('Checking all stored positions...');
        
        originalPositions.forEach((originalPos, id) => {
          // Find the node with this ID
          const nodes = this.layer?.find(`#${id}`);
          if (nodes && nodes.length > 0) {
            const node = nodes[0];
            if (node instanceof Konva.Shape || node instanceof Konva.Text) {
              const dx = Math.abs(originalPos.x - node.x());
              const dy = Math.abs(originalPos.y - node.y());
              console.log(`Node ${id} delta: dx=${dx}, dy=${dy}`);
              
              if (dx > 0.5 || dy > 0.5) {
                positionChanged = true;
                console.log('Position change detected on stored node:', id);
                
                // If the node is a text node, broadcast its new position
                if (node instanceof Konva.Text && !this.isReceivingData) {
                  this.broadcastTextNode(node);
                }
              }
            }
          }
        });
      }
      
      isDragging = false;
      originalPositions.clear();
      console.log('Drag ended, position changed:', positionChanged);
      
      // Only sync if position actually changed
      if (positionChanged) {
        // Send the complete canvas state
        this.sendCanvasState(false);
      }
    });
    
    // Setup text editing in select mode
    this.setupTextEditingInSelectMode();
  }

  /**
   * Setup text editing in select mode
   */
  private setupTextEditingInSelectMode(): void {
    if (!this.stage) return;
    
    // Remove existing dblclick handler
    this.stage.off('dblclick.textEdit');
    
    // Add double-click handler for text
    this.stage.on('dblclick.textEdit', (e) => {
      if (this.mode === 'select' && e.target instanceof Konva.Text) {
        console.log('Double-click to edit text');
        this.startTextEditing(e.target);
        this.isNewTextNode = false;
        e.cancelBubble = true;
      }
    });
  }

  /**
   * Disable selection mode
   */
  private disableSelection(): void {
    if (!this.stage) return;
    
    // Clear the current selection
    this.layer?.batchDraw();
    
    // Remove selection event listeners
    this.stage.off('click tap dragstart dragmove dragend dblclick.textEdit');
    
    // Reinitialize drawing events
    this.setupEventListeners();
  }

  /**
   * Update the brush color
   */
  updateColor(color: string): void {
    console.log('Updating color to', color);
    this.previousBrushColor = color;
    
    // If we're currently editing text, update its color
    if (this.textEditingEnabled && this.currentTextNode && this.textEditArea) {
      // Update textarea color for visual feedback
      this.textEditArea.style.color = color;
    }
  }

  /**
   * Update the brush size
   */
  updateBrushSize(size: number): void {
    this.previousBrushWidth = size;
    
    // Update eraser size if in eraser mode
    if (this.mode === 'eraser') {
      this.eraserRadius = size * 2;
    }
    
    // Update font size if in text mode
    if (this.mode === 'text') {
      this.defaultFontSize = Math.max(12, size * 3); // Scale font size based on brush size
      
      // If we're currently editing text, update its font size
      if (this.textEditingEnabled && this.currentTextNode && this.textEditArea) {
        const newSize = this.defaultFontSize;
        this.currentTextNode.fontSize(newSize);
        this.textEditArea.style.fontSize = `${newSize}px`;
      }
    }
  }
  
  /**
   * Get all selected objects
   */
  getSelectedObjects(): Konva.Node[] {
    return [];
  }
  
  /**
   * Delete selected objects
   */
  deleteSelectedObjects(): boolean {
    if (this.isSyncingCanvas) return false; // If syncing, disable interaction
    
    // If we're currently editing text, just finish that edit
    if (this.textEditingEnabled) {
      this.finishTextEditing();
      return true;
    }
    
    return false;
  }
  
  /**
   * Clear the canvas
   * @param broadcast Whether to broadcast this to other users
   */
  /**
 * Clear the canvas
 * @param broadcast Whether to broadcast this to other users
 */
  clearCanvas(broadcast = true): void {
    if (!this.stage || !this.layer) return;

    // Remove all existing shapes from the layer
    this.layer.removeChildren();

    // Add a new white rectangle that covers the entire stage
    const backgroundRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: this.stage.width(),
      height: this.stage.height(),
      fill: '#ffffff',
      listening: false
    });
    this.layer.add(backgroundRect);
    this.layer.draw();

    // Broadcast this clear action to other clients
    if (broadcast && !this.isReceivingData && this.roomId && !this.isSyncingCanvas) {
      socket.emit('client_canvasClear', { roomId: this.roomId });
      setTimeout(() => {
        this.sendCanvasState(false);
      }, 50);
    }
  }
  
  /**
   * Broadcast canvas clear to all users
   */
  broadcastClear(): void {
    if (this.isSyncingCanvas) return; // If syncing, disable interaction
    
    this.clearCanvas(true);
  }
  
  /**
   * Export the drawing as an image
   */
  toDataURL(mimeType: string = 'image/png', quality: number = 1): string {
    if (!this.stage) return '';
    // Get the data URL
    const dataURL = this.stage.toDataURL({ mimeType, quality });
    this.layer?.batchDraw();
    
    return dataURL;
  }
  
  /**
   * Import from JSON
   * @param json The JSON string to load
   * @param broadcast Whether to broadcast this to other users
   */
  loadFromJSON(json: string, broadcast: boolean = true): void {
    if (!this.layer) return;
    
    try {
      // Make sure text editing is completed before clearing
      if (this.textEditingEnabled) {
        this.finishTextEditing();
      }
      
      // Explicitly remove all text nodes first (just to be safe)
      const textNodes = this.layer.find('.text');
      textNodes.forEach(node => node.destroy());
      
      // Then clear existing content as before
      this.clearCanvas(false); // Don't broadcast clear
      
      // Parse the JSON
      const data = JSON.parse(json);
      
      console.log('Loading JSON with structure:', 
        data.children ? `${data.children.length} children` : 'No children array');
      
      // Add all shapes
      if (data.children && Array.isArray(data.children)) {
        data.children.forEach((childData: any) => {
          // Skip transformer and eraser
          if (childData.className === 'Transformer' || 
              (childData.className === 'Circle' && 
               childData.attrs && 
               childData.attrs.name === 'eraser')) {
            return;
          }
          
          try {
            // Create and add the shape
            const shape = Konva.Node.create(childData);
            
            // Make sure draggable property is set based on current mode
            if (shape instanceof Konva.Line || shape instanceof Konva.Text || shape instanceof Konva.Arrow || shape instanceof Konva.Rect) {
              shape.draggable(this.mode === 'select');
            }
            
            this.layer?.add(shape);
          } catch (shapeError) {
            console.error('Error creating shape:', shapeError, childData);
            // Continue with other shapes
          }
        });
      }
      
      this.layer.batchDraw();
      
      // Broadcast to other users if needed
      if (broadcast && !this.isReceivingData && this.roomId && !this.isSyncingCanvas) {
        const jsonContent = JSON.parse(json);
        socket.emit('upload_json_content', {
          roomId: this.roomId,
          jsonContent: jsonContent
        });
      }
    } catch (e) {
      console.error('Failed to load from JSON:', e);
      throw e; // Re-throw to allow callers to catch
    }
  }
  
  /**
   * Export to JSON
   */
  toJSON(): string {
    if (!this.layer) return '';
    
    // Get all shapes except transformer and eraser circle
    const children = this.layer.getChildren(node => {
      return !(node instanceof Konva.Circle && node.name() === 'eraser');
    });
    
    // Create a temporary layer with only these shapes
    const tempLayer = new Konva.Layer();
    children.forEach(child => {
      tempLayer.add(child.clone());
    });
    
    // Convert to JSON
    const json = tempLayer.toJSON();
    
    // Destroy the temporary layer
    tempLayer.destroy();
    
    return json;
  }
  
  /**
   * Broadcast JSON content to all users
   */
  broadcastJSON(jsonContent: string): void {
    if (!this.roomId || this.isSyncingCanvas) return;
    
    try {
      this.isSyncingCanvas = true;
      console.log('Broadcasting JSON content to all users in room:', this.roomId);
      
      // Parse the JSON to validate and to send it as an object to the server
      JSON.parse(jsonContent);
      
      // First load it locally to ensure it works
      try {
        this.loadFromJSON(jsonContent, false);
        
        socket.emit('upload_json_content', {
          roomId: this.roomId,
          jsonContent: jsonContent
        });
        
        console.log('JSON broadcast successful');
      } catch (loadError) {
        console.error('Failed to load JSON locally:', loadError);
        throw loadError; // Re-throw to trigger the outer catch
      }
    } catch (error) {
      console.error('Error broadcasting JSON:', error);
      // Send notification that broadcast failed
      alert('Failed to process the drawing file. The file may be corrupted or in an invalid format.');
    } finally {
      this.isSyncingCanvas = false;
    }
  }
  
  /**
   * Apply batch updates from cached drawings 
   */
  applyBatchUpdates(data: any[]): void {
    if (!this.layer || !Array.isArray(data)) return;
    
    try {
      this.isReceivingData = true;
      this.isSyncingCanvas = true;
      
      // Clear canvas for a fresh start
      this.clearCanvas(false);
      
      // Check if we have a JSON upload (full state) in the data
      const jsonUploads = data.filter(item => 
        item && item.type === 'json_upload' && item.jsonContent
      );
      
      if (jsonUploads.length > 0) {
        // Use the most recent JSON upload
        const latestUpload = jsonUploads[jsonUploads.length - 1];
        const jsonContent = typeof latestUpload.jsonContent === 'string'
          ? latestUpload.jsonContent
          : JSON.stringify(latestUpload.jsonContent);
          
        // Load the full state
        this.loadFromJSON(jsonContent, false);
        console.log('Applied full state from JSON upload');
      } else {
        // Apply individual drawing actions
        data.forEach(item => {
          if (item.lineData) {
            const newLine = new Konva.Line({
              points: item.lineData.points,
              stroke: item.lineData.stroke,
              strokeWidth: item.lineData.strokeWidth,
              lineCap: 'round',
              lineJoin: 'round',
              draggable: this.mode === 'select',
              name: 'drawable'
            });
            
            this.layer?.add(newLine);
          }
          
          // Handle text data
          if (item.textData) {
            const newText = new Konva.Text({
              x: item.textData.x,
              y: item.textData.y,
              text: item.textData.text,
              fontSize: item.textData.fontSize,
              fontFamily: item.textData.fontFamily || 'Arial',
              fill: item.textData.fill,
              padding: 5,
              draggable: this.mode === 'select',
              name: 'text'
            });
            
            this.layer?.add(newText);
          }

          // Handle arrow data
          if (item.arrowData) {
            const newArrow = new Konva.Arrow({
              points: item.arrowData.points,
              pointerLength: item.arrowData.pointerLength,
              pointerWidth: item.arrowData.pointerWidth,
              fill: item.arrowData.fill,
              stroke: item.arrowData.stroke,
              strokeWidth: item.arrowData.strokeWidth,
              lineCap: 'round',
              lineJoin: 'round',
              draggable: this.mode === 'select',
              name: 'drawable'
            });
            
            this.layer?.add(newArrow);
          }

          // Handle rectangle data
          if (item.rectData) {
            const newRect = new Konva.Rect({
              x: item.rectData.x,
              y: item.rectData.y,
              width: item.rectData.width,
              height: item.rectData.height,
              fill: item.rectData.fill,
              stroke: item.rectData.stroke,
              strokeWidth: item.rectData.strokeWidth,
              draggable: this.mode === 'select',
              name: 'drawable'
            });
            
            this.layer?.add(newRect);
          }
        });
      }
      
      this.layer?.batchDraw();
      console.log(`Applied batch update with ${data.length} actions`);
    } catch (error) {
      console.error('Error applying batch updates:', error);
    } finally {
      this.isReceivingCanvas = false;
      this.isSyncingCanvas = false;
    }
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    // Clear timers
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Disconnect socket listeners
    socket.off('server_drawing');
    socket.off('client_canvasClear');
    socket.off('uploaded_json_content');
    socket.off('canvas_state_update');
    
    // Remove text edit area
    if (this.textEditArea) {
      document.body.removeChild(this.textEditArea);
      this.textEditArea = null;
    }
    
    // Clear canvas
    if (this.stage) {
      this.stage.destroy();
      this.stage = null;
    }
    
    console.log('DrawingTools resources cleaned up');
  }

  /**
   * Send the current canvas state to the server
   * @param isUndoRedo Whether this update is from an undo/redo operation
   */
  sendCanvasState(isUndoRedo: boolean = false): void {
    if (!this.roomId || this.isReceivingData || this.isSyncingCanvas) return;
    
    try {
      this.isSyncingCanvas = true;
      
      // Get canvas state as JSON
      const canvasState = this.toJSON();
      
      // Send to server
      socket.emit('canvas_state_update', {
        roomId: this.roomId,
        canvasState: canvasState,
        isUndoRedo: isUndoRedo
      });
      
      console.log('Canvas state sent to server');
    } catch (error) {
      console.error('Error sending canvas state:', error);
    } finally {
      this.isSyncingCanvas = false;
    }
  }

  /**
   * Handle canvas state updates from the server
   * @param canvasState The JSON representation of the canvas state
   */
  loadCanvasState(canvasState: string): void {
    if (!this.layer) return;
    
    try {
      this.isReceivingData = true;
      this.isSyncingCanvas = true;
      
      // Clear the current canvas
      this.clearCanvas(false);
      
      // Load the new state
      this.loadFromJSON(canvasState, false);
      
      console.log('Canvas state loaded from server');
    } catch (error) {
      console.error('Error loading canvas state:', error);
    } finally {
      this.isReceivingData = false;
      this.isSyncingCanvas = false;
    }
  }

  /**
   * Handle arrow down event
   */
  private handleArrowDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const rawPos7 = this.stage?.getPointerPosition();
    if (!rawPos7) return;
    this.startPoint = {
      x: (rawPos7.x - this.stage.x()) / this.stage.scaleX(),
      y: (rawPos7.y - this.stage.y()) / this.stage.scaleY()
    };
    
    this.currentArrow = new Konva.Arrow({
      points: [this.startPoint.x, this.startPoint.y, this.startPoint.x, this.startPoint.y],
      pointerLength: 10,
      pointerWidth: 10,
      fill: this.previousBrushColor,
      stroke: this.previousBrushColor,
      strokeWidth: this.previousBrushWidth,
      lineCap: 'round',
      lineJoin: 'round',
      draggable: false,
      name: 'drawable'
    });
    
    this.layer?.add(this.currentArrow);
  }

  /**
   * Handle arrow move event
   */
  private handleArrowMove(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!this.currentArrow || !this.startPoint) return;
    
    const rawPos8 = this.stage?.getPointerPosition();
    if (!rawPos8) return;
    const pos8 = {
      x: (rawPos8.x - this.stage.x()) / this.stage.scaleX(),
      y: (rawPos8.y - this.stage.y()) / this.stage.scaleY()
    };
    
    const newPoints2 = [this.startPoint.x, this.startPoint.y, pos8.x, pos8.y];
    this.currentArrow.points(newPoints2);
    this.layer?.batchDraw();
  }

  /**
   * Handle arrow up event
   */
  private handleArrowUp(): void {
    if (!this.currentArrow) return;
    
    // Send arrow data to server if we're not already receiving data
    if (!this.isReceivingData && this.roomId && !this.isSyncingCanvas) {
      // Extract the arrow data to send
      const arrowData = {
        points: this.currentArrow.points(),
        pointerLength: this.currentArrow.pointerLength(),
        pointerWidth: this.currentArrow.pointerWidth(),
        fill: this.currentArrow.fill(),
        stroke: this.currentArrow.stroke(),
        strokeWidth: this.currentArrow.strokeWidth()
      };
      
      // Emit to server
      socket.emit('client_drawing', { 
        roomId: this.roomId, 
        arrowData: arrowData 
      });
      
      // Send the complete canvas state after a short delay
      // This ensures the arrow is added to all clients before sending the state
      setTimeout(() => {
        this.sendCanvasState(false);
      }, 50);
      
    }
    
    this.currentArrow = null;
    this.startPoint = null;
  }

  /**
   * Handle rectangle down event
   */
  private handleRectangleDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const rawPos9 = this.stage?.getPointerPosition();
    if (!rawPos9) return;
    this.startPoint = {
      x: (rawPos9.x - this.stage.x()) / this.stage.scaleX(),
      y: (rawPos9.y - this.stage.y()) / this.stage.scaleY()
    };
    
    this.currentRect = new Konva.Rect({
      x: this.startPoint.x,
      y: this.startPoint.y,
      width: 0,
      height: 0,
      fill: 'transparent',
      stroke: this.previousBrushColor,
      strokeWidth: this.previousBrushWidth,
      draggable: false,
      name: 'drawable'
    });
    
    this.layer?.add(this.currentRect);
  }

  /**
   * Handle rectangle move event
   */
  private handleRectangleMove(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (!this.startPoint || !this.currentRect) return;
    
    // Prevent scrolling on touch devices
    e.evt.preventDefault();
    
    const rawPos10 = this.stage?.getPointerPosition();
    if (!rawPos10) return;
    const pos10 = {
      x: (rawPos10.x - this.stage.x()) / this.stage.scaleX(),
      y: (rawPos10.y - this.stage.y()) / this.stage.scaleY()
    };
    
    // Calculate the new dimensions
    const width = pos10.x - this.startPoint.x;
    const height = pos10.y - this.startPoint.y;
    
    // If width or height is negative, adjust the position and dimensions
    if (width < 0) {
      this.currentRect.x(pos10.x);
      this.currentRect.width(Math.abs(width));
    } else {
      this.currentRect.width(width);
    }
    
    if (height < 0) {
      this.currentRect.y(pos10.y);
      this.currentRect.height(Math.abs(height));
    } else {
      this.currentRect.height(height);
    }
    
    this.layer?.batchDraw();
  }
  

  /**
   * Handle rectangle up event
   */
  private handleRectangleUp(): void {
    if (!this.currentRect) {
      this.startPoint = null;
      return;
    }
    
    // Ensure rectangle has minimum dimensions
    if (this.currentRect.width() < 2) this.currentRect.width(2);
    if (this.currentRect.height() < 2) this.currentRect.height(2);
    
    // Extract rectangle data for WebSocket sync
    const rectData = {
      x: this.currentRect.x(),
      y: this.currentRect.y(),
      width: this.currentRect.width(),
      height: this.currentRect.height(),
      stroke: this.currentRect.stroke(),
      strokeWidth: this.currentRect.strokeWidth(),
      fill: this.currentRect.fill(),
      cornerRadius: this.currentRect.cornerRadius()
    };
    
    // Send data to server if not already receiving data
    if (!this.isReceivingData && this.roomId && !this.isSyncingCanvas) {
      // Emit to server with rectangle data
      socket.emit('client_drawing', { 
        roomId: this.roomId, 
        rectData: rectData 
      });
      
      // Send the complete canvas state after a short delay
      setTimeout(() => {
        this.sendCanvasState(false);
      }, 50);
      
    }
    
    this.currentRect = null;
    this.startPoint = null;
  }

  /**
   * Disable all interactions (lock the board)
   */
  public disableAllInteractions(): void {
    if (!this.stage) return;
    
    // Store the current mode for later restoration
    this._previousMode = this.mode;
    
    // Disable all event listeners
    this.stage.off('mousedown touchstart mousemove touchmove mouseup touchend');
    
    // Disable dragging for all objects
    this.setAllObjectsDraggable(false);
    
    // Change cursor to indicate locked state
    this.stage.container().style.cursor = 'not-allowed';
    
    // Refresh layer
    this.layer?.batchDraw();
    
    console.log('All board interactions disabled (locked)');
  }

  /**
   * Enable all interactions (unlock the board)
   */
  public enableAllInteractions(): void {
    if (!this.stage) return;
    
    // Reset cursor
    this.stage.container().style.cursor = 'default';
    
    // Restore previous mode and reinitialize events
    this.setupEventListeners();
    
    console.log('Board interactions re-enabled (unlocked)');
  }
}