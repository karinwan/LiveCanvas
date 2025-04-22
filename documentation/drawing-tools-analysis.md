# Analysis of DrawingTools: Tool Logic, Konva Usage, and WebSocket Events

This document provides a comprehensive analysis of the `drawingTools.ts` implementation, breaking down each tool's logic, Konva usage, and WebSocket event emissions.

## 1. Pencil Tool

### Logic
- **Mouse Down**: Creates a new `Konva.Line` with initial position
- **Mouse Move**: Adds points to the line array as the mouse moves
- **Mouse Up**: Finalizes the line and broadcasts to other users

### Konva Usage
```typescript
this.currentLine = new Konva.Line({
  stroke: this.previousBrushColor,
  strokeWidth: this.previousBrushWidth,
  globalCompositeOperation: 'source-over',
  lineCap: 'round',
  lineJoin: 'round',
  points: [pos.x, pos.y, pos.x, pos.y],
  name: 'drawable',
  draggable: false
});
this.layer?.add(this.currentLine);
```

### Socket Events
```typescript
// Broadcasts individual line data
socket.emit('client_drawing', { 
  roomId: this.roomId, 
  lineData: {
    points: this.currentLine.points(),
    stroke: this.currentLine.stroke(),
    strokeWidth: this.currentLine.strokeWidth()
  }
});

// Then sends complete canvas state after a delay
setTimeout(() => {
  this.sendCanvasState(false);
}, 50);
```

## 2. Eraser Tool

### Logic
- **Mouse Down**: Activates eraser mode
- **Mouse Move**: Shows eraser circle and checks for collisions with drawn objects
- **Mouse Up**: Completes erasing and updates the canvas state

### Konva Usage
```typescript
// Eraser visualization
this.eraserCircle = new Konva.Circle({
  x: 0,
  y: 0,
  radius: this.eraserRadius,
  stroke: '#000000',
  strokeWidth: 1,
  dash: [2, 2],
  fill: 'rgba(255, 0, 0, 0.2)',
  visible: false,
  name: 'eraser'
});

// Erasing objects through collision detection
if (shouldErase) {
  node.destroy();
  didErase = true;
}
```

### Socket Events
```typescript
// After erasing, sends updated canvas state
if (didErase) {
  this.layer.batchDraw();
  if (!this.isReceivingData && !this.isSyncingCanvas) {
    this.sendCanvasState(false);
  }
}
```

## 3. Text Tool

### Logic
- **Mouse Down**: Creates a new text node or starts editing existing text
- **Editing**: Uses HTML textarea for text input, positioned over the Konva text node
- **Blur/Enter**: Finalizes text and updates the Konva stage

### Konva Usage
```typescript
// Creating text node
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
this.layer?.add(text);
```

### Socket Events
```typescript
// Broadcasts text node data
this.broadcastTextNode(this.currentTextNode);

// Text node broadcasting
socket.emit('client_drawing', {
  roomId: this.roomId,
  textData: {
    x: textNode.x(),
    y: textNode.y(),
    text: textNode.text(),
    fontSize: textNode.fontSize(),
    fontFamily: textNode.fontFamily(),
    fill: textNode.fill()
  }
});
```

## 4. Arrow Tool

### Logic
- **Mouse Down**: Records start point and creates initial arrow
- **Mouse Move**: Updates end point of arrow
- **Mouse Up**: Finalizes arrow and broadcasts

### Konva Usage
```typescript
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
```

### Socket Events
```typescript
socket.emit('client_drawing', { 
  roomId: this.roomId, 
  arrowData: {
    points: this.currentArrow.points(),
    pointerLength: this.currentArrow.pointerLength(),
    pointerWidth: this.currentArrow.pointerWidth(),
    fill: this.currentArrow.fill(),
    stroke: this.currentArrow.stroke(),
    strokeWidth: this.currentArrow.strokeWidth()
  }
});
```

## 5. Rectangle Tool

### Logic
- **Mouse Down**: Sets start point and creates initial rectangle
- **Mouse Move**: Updates width/height and handles negative dimensions
- **Mouse Up**: Finalizes rectangle and broadcasts

### Konva Usage
```typescript
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
```

### Socket Events
```typescript
socket.emit('client_drawing', { 
  roomId: this.roomId, 
  rectData: {
    x: this.currentRect.x(),
    y: this.currentRect.y(),
    width: this.currentRect.width(),
    height: this.currentRect.height(),
    stroke: this.currentRect.stroke(),
    strokeWidth: this.currentRect.strokeWidth(),
    fill: this.currentRect.fill(),
    cornerRadius: this.currentRect.cornerRadius()
  }
});
```

## 6. Pan Tool

### Logic
- **Mouse Down**: Starts panning mode and changes cursor
- **Mouse Move**: Updates stage position based on mouse movement
- **Mouse Up**: Ends panning mode

### Konva Usage
```typescript
// Calculate distance moved
const dx = pos.x - this.lastPointerPosition.x;
const dy = pos.y - this.lastPointerPosition.y;

// Update stage position
const newX = this.stage.x() + dx;
const newY = this.stage.y() + dy;

this.stage.position({ x: newX, y: newY });
this.stage.batchDraw();
```

### Socket Events
- None (panning is a local view change that doesn't affect the shared canvas)

## 7. Select Tool

### Logic
- Enables object selection and dragging
- Handles object selection, dragging, and text editing via double-click
- Manages position changes and broadcasts updates

### Konva Usage
```typescript
// Set objects as draggable
this.setAllObjectsDraggable(true);

// Event handlers for selection, dragging, double-click, etc.
this.stage.on('click tap', (e) => {
  // Selection logic
});

this.stage.on('dragstart', (e) => {
  // Start dragging logic
});

this.stage.on('dragend', (e) => {
  // End dragging and broadcast
});

this.stage.on('dblclick.textEdit', (e) => {
  // Text editing logic
});
```

### Socket Events
```typescript
// After dragging ends
if (positionChanged && !this.isReceivingData) {
  this.sendCanvasState(false);
}
```

## 8. Clear Canvas

### Logic
- Removes all objects from the layer
- Adds a white background rectangle
- Broadcasts clear action to all clients

### Konva Usage
```typescript
// Remove all existing shapes
this.layer.removeChildren();

// Add a new white background
const backgroundRect = new Konva.Rect({
  x: 0,
  y: 0,
  width: this.stage.width(),
  height: this.stage.height(),
  fill: '#ffffff',
  listening: false
});
this.layer.add(backgroundRect);
```

### Socket Events
```typescript
socket.emit("client_canvasClear", { roomId: this.roomId });
setTimeout(() => {
  this.sendCanvasState(false);
}, 50);
```

## 9. JSON Upload/Import

### Logic
- Loads JSON content to the canvas
- Handles different object types
- Broadcasts to all clients

### Konva Usage
```typescript
// Parse JSON and create objects
const data = JSON.parse(json);
data.children.forEach((childData) => {
  const shape = Konva.Node.create(childData);
  this.layer?.add(shape);
});
```

### Socket Events
```typescript
socket.emit('upload_json_content', {
  roomId: this.roomId,
  jsonContent: jsonContent
});
```

## WebSocket Event Communication Pattern

For all tools, a common pattern is implemented:
1. Immediate update: Send specific drawing data for realtime feedback
2. Delayed complete state: Send full canvas state shortly after for consistency

This two-step approach provides both immediate responsiveness and ensures all clients eventually have the same complete state.
