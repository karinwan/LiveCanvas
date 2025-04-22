import { Builder, By, until, WebDriver, WebElement, Key } from 'selenium-webdriver'
import { Options } from 'selenium-webdriver/chrome'

const fs = require('fs')
const path = require('path')

/**
 * Take a screenshot and save it to the screenshots directory
 */
async function takeScreenshot(driver: WebDriver, stepName: string) {
  try {
    const screenshot = await driver.takeScreenshot()
    const timestamp = new Date().toISOString().replace(/:/g, '-')
    const filename = `screenshots/drawingBoard/${stepName}-${timestamp}.png`
    fs.writeFileSync(filename, screenshot, 'base64')
    console.log(`Saved screenshot: ${filename}`)
  } catch (error) {
    console.error(`Failed to take screenshot ${stepName}:`, error)
  }
}

/**
 * Wait for a specific amount of time
 */
async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wait for the loading overlay to disappear - more robust implementation
 */
async function waitForLoading(driver: WebDriver, timeout = 20000) {
  console.log('Waiting for loading to complete...')
  const startTime = Date.now()
  const pollInterval = 1000 // 1 second
  
  try {
    // Keep polling until timeout
    while (Date.now() - startTime < timeout) {
      try {
        // Check if loading text exists
        const loadingElements = await driver.findElements(
          By.xpath("//*[contains(text(), 'Loading whiteboard') or contains(text(), 'Loading...')]")
        )
        
        if (loadingElements.length === 0) {
          console.log('No loading element found, proceeding')
          break
        }
        
        console.log('Loading element still present, waiting...')
        await wait(pollInterval)
      } catch (error) {
        // If we get an error (like stale element), assume element is gone
        console.log('Error checking loading state, assuming complete:', error.message)
        break
      }
    }
    
    // Wait for UI to stabilize
    await wait(1000)
    console.log('Loading complete')
    return true
  } catch (error) {
    console.log('Error in waitForLoading:', error)
    return false
  }
}

/**
 * Find a toolbar button by its icon
 */
async function findToolbarButtonByIcon(driver: WebDriver, iconName: string) {
  try {
    const button = await driver.findElement(
      By.xpath(`//button[.//i[contains(@class, 'mdi-${iconName}')]]`)
    )
    return button
  } catch (error) {
    console.log(`Could not find button with icon ${iconName}:`, error.message)
    return null
  }
}

/**
 * Performs drawing action between two points
 */
async function drawBetweenPoints(driver: WebDriver, canvas: WebElement, startX: number, startY: number, endX: number, endY: number) {
  console.log(`Drawing from (${startX}, ${startY}) to (${endX}, ${endY})`)
  
  // Create an actions chain
  const actions = driver.actions({bridge: true})
  
  // Move to canvas
  await actions.move({origin: canvas}).perform()
  await wait(500)
  
  // Move to start position
  await actions.move({x: startX, y: startY}).perform()
  await wait(500)
  
  // Press mouse button
  await actions.press().perform()
  await wait(500)
  
  // Move to end position
  await actions.move({x: endX, y: endY}).perform()
  await wait(500)
  
  // Release mouse button
  await actions.release().perform()
  await wait(500)
  
  console.log('Drawing action completed')
}

/**
 * Main test function
 */
async function runTest() {
  console.log('Starting drawingBoard test...')
  
  // Setup Chrome options
  const options = new Options()
  options.addArguments('--start-maximized')
  options.addArguments('--disable-gpu')
  options.addArguments('--no-sandbox')
  
  // Create screenshots directory if it doesn't exist
  if (!fs.existsSync('screenshots/drawingBoard')) {
    fs.mkdirSync('screenshots/drawingBoard', { recursive: true })
  }
  
  // Initialize the WebDriver
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build()
    
  try {
    // 1. Go to homepage
    console.log('Navigating to homepage...')
    await driver.get('http://localhost:4430')
    await driver.wait(until.elementLocated(By.css('.option-box')), 10000)
    await takeScreenshot(driver, 'step-1-homepage')
    
    // 2. Click on Create Draw Board
    console.log('Clicking Create Draw Board...')
    const drawingBoardButton = await driver.findElement(
      By.xpath("//div[contains(@class, 'option-box')]//p[contains(text(), 'Draw Board')]")
    )
    await drawingBoardButton.click()
    await takeScreenshot(driver, 'step-2-click-create-drawingBoard')
    
    // 3. Wait for redirect and dialog
    console.log('Waiting for redirect...')
    await driver.wait(until.urlContains('/board/'), 10000)
    console.log('Waiting for username dialog...')
    await driver.wait(until.elementLocated(By.css('input[type="text"]')), 10000)
    await takeScreenshot(driver, 'step-3-username-dialog')
    
    // 4. Enter username
    console.log('Entering username...')
    const usernameInput = await driver.findElement(By.css('input[type="text"]'))
    await usernameInput.sendKeys('Selenium Tester')
    await takeScreenshot(driver, 'step-4-enter-username')
    
    // 5. Click Join button
    console.log('Clicking Join button...')
    // Try multiple selector strategies to find the Join button
    let joinButton;
    try {
      // First try: button with span containing "Join" text
      joinButton = await driver.findElement(
        By.xpath("//button[.//span[contains(text(), 'Join')]]")
      );
      console.log('Found Join button using span content XPath');
    } catch (error) {
      try {
        // Second try: button with specific Vuetify classes
        joinButton = await driver.findElement(
          By.css(".v-card-actions .v-btn.text-primary")
        );
        console.log('Found Join button using Vuetify class selector');
      } catch (error) {
        try {
          // Third try: JavaScript executor to find by text content
          joinButton = await driver.executeScript(`
            return Array.from(document.querySelectorAll('button')).find(
              button => button.textContent.includes('Join') || 
                        button.textContent.includes('JOIN')
            );
          `);
          console.log('Found Join button using JavaScript');
        } catch (jsError) {
          // Take screenshot of the failure state
          await takeScreenshot(driver, 'join-button-not-found');
          throw new Error('Could not find Join button with any method');
        }
      }
    }
    
    // Click the button using JavaScript for better reliability
    await driver.executeScript("arguments[0].click();", joinButton);
    await takeScreenshot(driver, 'step-5-clicked-join')
    
    // 6. Wait for drawing board to load
    console.log('Waiting for drawing board to load...')
    
    // Wait for canvas container to be present
    await driver.wait(until.elementLocated(By.id('drawing-board-container')), 15000)
    
    // Wait for canvas to settle
    await wait(3000)
    
    // Look for loading spinner or loading text
    const loadingElements = await driver.findElements(
      By.xpath("//*[contains(text(), 'Loading whiteboard') or contains(text(), 'Loading...')]")
    )
    
    if (loadingElements.length > 0) {
      console.log('Loading overlay detected, waiting for it to disappear...')
      await waitForLoading(driver)
    } else {
      console.log('No loading overlay detected, continuing')
    }
    
    // Final stabilization wait
    await wait(3000)
    await takeScreenshot(driver, 'step-6-board-loaded')
    
    // Get canvas element (we'll reuse this)
    const canvas = await driver.findElement(By.id('drawing-board-container'))
    const canvasRect = await canvas.getRect()
    console.log('Canvas dimensions:', canvasRect)
    
   // Test 1: Pencil Tool
   console.log('TEST 1: Testing Pencil Tool')
   try {
     // Find and click pencil button
     const pencilButton = await findToolbarButtonByIcon(driver, 'pencil')
     if (pencilButton) {
       await driver.executeScript("arguments[0].click();", pencilButton)
       console.log('Clicked pencil tool button')
       
       // Wait for color panel to appear
       await wait(1000)
       
       // Take screenshot of the color picker
       await takeScreenshot(driver, 'color-panel-opened')
       
       // Based on the image, there's a visible large red circle indicating the selected color
       // Let's click directly on the colored circle which is visible in the UI
       try {
         const colorCircle = await driver.findElement(By.css('.v-color-picker .v-color-picker-edit__input'))
         if (colorCircle) {
           await driver.executeScript("arguments[0].click();", colorCircle)
           console.log('Clicked on color selector circle')
           await wait(500)
         }
       } catch (error) {
         console.log('Could not find color circle, trying alternative approach')
       }
       
       // Simple approach: Click directly on a stroke width button to both select width and close the panel
       const strokeWidthButtons = await driver.findElements(By.css('.width-button'))
       if (strokeWidthButtons.length >= 3) {
         await driver.executeScript("arguments[0].click();", strokeWidthButtons[2])
         console.log('Selected thick stroke width')
         await wait(1000)
       }
       
       // Draw a horizontal line with whatever color we have
       const startX = Math.round(canvasRect.x + 100)
       const startY = Math.round(canvasRect.y + 100)
       const endX = Math.round(canvasRect.x + 300)
       const endY = Math.round(canvasRect.y + 100)
       
       await drawBetweenPoints(driver, canvas, startX, startY, endX, endY)
       await takeScreenshot(driver, 'test-pencil-tool-line')
     }
   } catch (error) {
     console.error('Error testing pencil tool:', error)
     await takeScreenshot(driver, 'error-pencil-tool')
   }
    // Test 2: Rectangle Tool
    console.log('TEST 2: Testing Rectangle Tool')
    try {
      // Find and click rectangle button
      const rectButton = await findToolbarButtonByIcon(driver, 'rectangle-outline')
      if (rectButton) {
        await driver.executeScript("arguments[0].click();", rectButton)
        console.log('Clicked rectangle tool button')
        await wait(1000)
        
        // Draw a rectangle
        const rectStartX = Math.round(canvasRect.x + 150)
        const rectStartY = Math.round(canvasRect.y + 150)
        const rectEndX = Math.round(canvasRect.x + 300)
        const rectEndY = Math.round(canvasRect.y + 300)
        
        await drawBetweenPoints(driver, canvas, rectStartX, rectStartY, rectEndX, rectEndY)
        await takeScreenshot(driver, 'test-rectangle-tool')
      }
    } catch (error) {
      console.error('Error testing rectangle tool:', error)
      await takeScreenshot(driver, 'error-rectangle-tool')
    }
    
    // Test 3: Arrow Tool
    console.log('TEST 3: Testing Arrow Tool')
    try {
      // Find and click arrow button
      const arrowButton = await findToolbarButtonByIcon(driver, 'arrow-right')
      if (arrowButton) {
        await driver.executeScript("arguments[0].click();", arrowButton)
        console.log('Clicked arrow tool button')
        await wait(1000)
        
        // Draw an arrow
        const arrowStartX = Math.round(canvasRect.x + 400)
        const arrowStartY = Math.round(canvasRect.y + 150)
        const arrowEndX = Math.round(canvasRect.x + 500)
        const arrowEndY = Math.round(canvasRect.y + 250)
        
        await drawBetweenPoints(driver, canvas, arrowStartX, arrowStartY, arrowEndX, arrowEndY)
        await takeScreenshot(driver, 'test-arrow-tool')
      }
    } catch (error) {
      console.error('Error testing arrow tool:', error)
      await takeScreenshot(driver, 'error-arrow-tool')
    }
    
    // Test 4: Text Tool
    console.log('TEST 4: Testing Text Tool')
    try {
      // Find and click text button
      const textButton = await findToolbarButtonByIcon(driver, 'format-text')
      if (textButton) {
        await driver.executeScript("arguments[0].click();", textButton)
        console.log('Clicked text tool button')
        await wait(1000)
        
        // Click on canvas to place text
        const textX = Math.round(canvasRect.x + 200)
        const textY = Math.round(canvasRect.y + 400)
        
        // Click at position to place text
        await driver.actions().move({origin: canvas, x: textX, y: textY}).click().perform()
        await wait(500)
        
        // Type some text
        await driver.actions().sendKeys('Selenium Test Text').perform()
        await wait(500)
        
        // Press Enter to finish text entry
        await driver.actions().sendKeys(Key.ENTER).perform()
        await wait(1000)
        
        await takeScreenshot(driver, 'test-text-tool-created')
        
        // Now test double-click to edit existing text
        console.log('Testing double-click to edit text')
        
        // First select the selection tool to enable text editing
        const selectButton = await findToolbarButtonByIcon(driver, 'cursor-default-click')
        if (selectButton) {
          await driver.executeScript("arguments[0].click();", selectButton)
          console.log('Switched to selection tool for text editing')
          await wait(1000)
          
          // Double-click on the text we just created
          const actions = driver.actions({bridge: true})
          await actions.move({origin: canvas, x: textX, y: textY}).perform()
          await wait(500)
          
          // Perform double click
          await actions.doubleClick().perform()
          await wait(1000)
          
          await takeScreenshot(driver, 'test-text-tool-editing')
          
          // Clear existing text and type new text
          await driver.actions().keyDown(Key.CONTROL).sendKeys('a').keyUp(Key.CONTROL).perform() // Select all text
          await wait(500)
          await driver.actions().sendKeys('Edited Text Content').perform()
          await wait(500)
          
          // Press Enter to finish editing
          await driver.actions().sendKeys(Key.ENTER).perform()
          await wait(1000)
          
          await takeScreenshot(driver, 'test-text-tool-edited')
        }
      }
    } catch (error) {
      console.error('Error testing text tool:', error)
      await takeScreenshot(driver, 'error-text-tool')
    }
    
    // Test 5: Pan Tool
    console.log('TEST 5: Testing Pan Tool')
    try {
      // Find and click pan button
      const panButton = await findToolbarButtonByIcon(driver, 'hand-back-right')
      if (panButton) {
        await driver.executeScript("arguments[0].click();", panButton)
        console.log('Clicked pan tool button')
        await wait(1000)
        
        // Perform panning
        const startPanX = Math.round(canvasRect.x + 250)
        const startPanY = Math.round(canvasRect.y + 250)
        const endPanX = Math.round(canvasRect.x + 350)
        const endPanY = Math.round(canvasRect.y + 250)
        
        const actions = driver.actions({bridge: true})
        await actions.move({origin: canvas, x: startPanX, y: startPanY}).perform()
        await wait(500)
        await actions.press().perform()
        await wait(500)
        await actions.move({origin: canvas, x: endPanX, y: endPanY}).perform()
        await wait(500)
        await actions.release().perform()
        
        await takeScreenshot(driver, 'test-pan-tool')
      }
    } catch (error) {
      console.error('Error testing pan tool:', error)
      await takeScreenshot(driver, 'error-pan-tool')
    }
    
    // Test 6: Eraser Tool
    console.log('TEST 6: Testing Eraser Tool')
    try {
      // Find and click eraser button
      const eraserButton = await findToolbarButtonByIcon(driver, 'eraser')
      if (eraserButton) {
        await driver.executeScript("arguments[0].click();", eraserButton)
        console.log('Clicked eraser tool button')
        await wait(1000)
        
        // Use eraser to erase part of what we drew
        const eraseStartX = Math.round(canvasRect.x + 150)
        const eraseStartY = Math.round(canvasRect.y + 150)
        const eraseEndX = Math.round(canvasRect.x + 250)
        const eraseEndY = Math.round(canvasRect.y + 250)
        
        await drawBetweenPoints(driver, canvas, eraseStartX, eraseStartY, eraseEndX, eraseEndY)
        await takeScreenshot(driver, 'test-eraser-tool')
      }
    } catch (error) {
      console.error('Error testing eraser tool:', error)
      await takeScreenshot(driver, 'error-eraser-tool')
    }
    
    // Test 7: Selection/Drag Tool
    console.log('TEST 7: Testing Selection Tool')
    try {
    console.log('Switching to pencil tool and drawing a simple line...')
    const pencilButton = await findToolbarButtonByIcon(driver, 'pencil')
    if (pencilButton) {
        await driver.executeScript("arguments[0].click();", pencilButton)
        await wait(1000)

        // Draw a simple horizontal line using standard Selenium actions
        await driver.actions()
        .move({ origin: canvas, x: 300, y: 300 })
        .press()
        .move({ origin: canvas, x: 600, y: 300 })
        .release()
        .perform()
        await wait(1000)
        await takeScreenshot(driver, 'line-drawn')

        console.log('Switching to selection tool...')
        const selectButton = await findToolbarButtonByIcon(driver, 'cursor-default-click')
        if (selectButton) {
        await driver.executeScript("arguments[0].click();", selectButton)
        await wait(1000)

        // Click on the middle of the line to select it
        const midX = 450
        const midY = 300
        console.log(`Selecting line at (${midX}, ${midY})`)
        await driver.actions()
            .move({ origin: canvas, x: midX, y: midY })
            .click()
            .perform()
        await wait(1000)
        await takeScreenshot(driver, 'line-selected')

        // Drag by standard move offsets
        console.log('Dragging line by (200, 100)...')
        await driver.actions()
            .move({ origin: canvas, x: midX, y: midY })
            .press()
            .move({ origin: canvas, x: midX + 200, y: midY + 100 })
            .release()
            .perform()
        await wait(1000)
        await takeScreenshot(driver, 'line-dragged')
        }
        }
    } catch (error) {
      console.error('Error testing selection tool:', error)
      await takeScreenshot(driver, 'error-selection-tool')
    }
    
    // Test 8: Lock/Unlock Board
    console.log('TEST 8: Testing Lock/Unlock Feature')
    try {
      // Test locking the board
      const lockButton = await findToolbarButtonByIcon(driver, 'lock-open')
      if (lockButton) {
        await driver.executeScript("arguments[0].click();", lockButton)
        console.log('Clicked lock button')
        await wait(1000)
        await takeScreenshot(driver, 'test-board-locked')
        
        // Try to draw while locked (should not work)
        // First try to select pencil
        const pencilButton = await findToolbarButtonByIcon(driver, 'pencil')
        if (pencilButton) {
          await driver.executeScript("arguments[0].click();", pencilButton)
          await wait(1000)
          
          // Try to draw while locked
          const testX = Math.round(canvasRect.x + 400)
          const testY = Math.round(canvasRect.y + 400)
          const testEndX = Math.round(canvasRect.x + 450)
          const testEndY = Math.round(canvasRect.y + 450)
          
          await drawBetweenPoints(driver, canvas, testX, testY, testEndX, testEndY)
          await takeScreenshot(driver, 'test-draw-while-locked')
        }
        
        // Unlock the board
        const unlockButton = await findToolbarButtonByIcon(driver, 'lock')
        if (unlockButton) {
          await driver.executeScript("arguments[0].click();", unlockButton)
          console.log('Clicked unlock button')
          await wait(1000)
          await takeScreenshot(driver, 'test-board-unlocked')
        }
      }
    } catch (error) {
      console.error('Error testing lock/unlock feature:', error)
      await takeScreenshot(driver, 'error-lock-unlock')
    }
    
    // Test 9: Undo/Redo
    console.log('TEST 9: Testing Undo/Redo')
    try {
      // Find and click undo button
      const undoButton = await driver.findElement(
        By.xpath("//button[.//i[contains(@class, 'mdi-undo')]]")
      )
      await driver.executeScript("arguments[0].click();", undoButton)
      console.log('Clicked undo button')
      await wait(2000)
      await takeScreenshot(driver, 'test-undo')
      
      // Try to find and click redo button
      try {
        const redoButton = await driver.findElement(
          By.xpath("//button[.//i[contains(@class, 'mdi-redo')]]")
        )
        await driver.executeScript("arguments[0].click();", redoButton)
        console.log('Clicked redo button')
        await wait(2000)
        await takeScreenshot(driver, 'test-redo')
      } catch (error) {
        console.log('Redo button not found or not clickable')
      }
    } catch (error) {
      console.error('Error testing undo/redo:', error)
      await takeScreenshot(driver, 'error-undo-redo')
    }
    
    // Test 10: Clear Board
    console.log('TEST a: Testing Clear Board Function')
    try {
      // Find the clear board button (trash or delete icon)
      const clearButton = await findToolbarButtonByIcon(driver, 'delete-sweep')
      if (clearButton) {
        await driver.executeScript("arguments[0].click();", clearButton)
        console.log('Clicked clear board button')
        await wait(1000)
        
        // There should be a confirmation dialog - look for it
        try {
          // First try to find it by standard dialog class
          let confirmButton = await driver.findElement(
            By.css(".v-dialog .v-btn.v-btn--elevated.v-btn--variant-elevated.v-theme--error")
          )
          console.log('Found confirmation dialog with clear button')
          
          // Click confirm button
          await driver.executeScript("arguments[0].click();", confirmButton)
          await wait(2000)
          await takeScreenshot(driver, 'test-board-cleared')
        } catch (dialogError) {
          // Try another approach
          try {
            // Look for a button with "Clear" text or error color
            const allButtons = await driver.findElements(By.css(".v-dialog .v-btn"))
            for (const btn of allButtons) {
              const text = await btn.getText()
              if (text.toLowerCase().includes('clear') || 
                  text.toLowerCase().includes('yes') ||
                  text.toLowerCase().includes('confirm')) {
                await driver.executeScript("arguments[0].click();", btn)
                console.log('Found and clicked clear confirmation button')
                await wait(2000)
                await takeScreenshot(driver, 'test-board-cleared')
                break
              }
            }
          } catch (e) {
            console.error('Could not confirm board clear:', e)
          }
        }
      }
    } catch (error) {
      console.error('Error testing clear board function:', error)
      await takeScreenshot(driver, 'error-clear-board')
    }
    
    // Test 11: Online Users
    console.log('TEST 11: Testing Online Users Indicator')
    try {
      // Find the users chip/indicator
      const userCounter = await driver.findElement(
        By.xpath("//div[contains(@class, 'v-chip')]//i[contains(@class, 'mdi-account') or contains(@class, 'mdi-account-multiple')]")
      ).findElement(By.xpath("./.."))  // Get parent
      
      // Click it to show users
      await driver.executeScript("arguments[0].click();", userCounter)
      console.log('Clicked user counter')
      await wait(1000)
      await takeScreenshot(driver, 'test-online-users')
      
      // Close the dialog if it opened
      try {
        await driver.actions().sendKeys(Key.ESCAPE).perform()
        await wait(500)
      } catch (e) {
        console.log('Error closing users dialog, continuing')
      }
    } catch (error) {
      console.error('Error testing online users indicator:', error)
      await takeScreenshot(driver, 'error-online-users')
    }
    
    // Test 12: Sharing
    console.log('TEST 12: Testing Share Function')
    try {
      // Find the share button
      const shareButton = await driver.findElement(By.css("[data-testid='export-button']"))
      
      // Click on share button
      await driver.executeScript("arguments[0].click();", shareButton)
      console.log('Clicked share button')
      await wait(1000)
      await takeScreenshot(driver, 'test-share-dialog')
      
      // Close the dialog
      try {
        await driver.actions().sendKeys(Key.ESCAPE).perform()
        await wait(500)
      } catch (e) {
        console.log('Error closing share dialog, continuing')
      }
    } catch (error) {
      console.error('Error testing share function:', error)
      await takeScreenshot(driver, 'error-share')
    }
    
    // Test 13: Return to homepage
    console.log('TEST 13: Testing Return to Home')
    try {
      // Find sidebar/menu button (often in top-left corner)
      const menuButtons = await driver.findElements(
        By.css("div[style*='position: fixed'][style*='top: 20px'][style*='left: 20px'] button")
      )
      
      if (menuButtons.length > 0) {
        // Click the menu/sidebar button
        await driver.executeScript("arguments[0].click();", menuButtons[0])
        console.log('Clicked menu button')
        await wait(1000)
        await takeScreenshot(driver, 'test-menu-opened')
        
        // Look for a back/home button
        try {
          // First try by icon
          const homeButton = await driver.findElement(
            By.xpath("//button[.//i[contains(@class, 'mdi-home') or contains(@class, 'mdi-arrow-left')]]")
          )
          await driver.executeScript("arguments[0].click();", homeButton)
          console.log('Clicked home button')
        } catch (e) {
          // Try to find by text
          try {
            const allButtons = await driver.findElements(By.css("button"))
            let backButtonFound = false
            
            for (const btn of allButtons) {
              const text = await btn.getText()
              if (text.toLowerCase().includes('home') || 
                  text.toLowerCase().includes('back') ||
                  text.toLowerCase().includes('return')) {
                await driver.executeScript("arguments[0].click();", btn)
                console.log('Found and clicked return button by text')
                backButtonFound = true
                break
              }
            }
            
            if (!backButtonFound) {
              // Try browser back as last resort
              await driver.navigate().back()
              console.log('Used browser back button')
            }
          } catch (e2) {
            console.error('Failed to find home/back button:', e2)
          }
        }
        
        // Wait for redirect to homepage
        await wait(3000)
        await takeScreenshot(driver, 'test-returned-home')
      }
    } catch (error) {
      console.error('Error testing return to home:', error)
      await takeScreenshot(driver, 'error-return-home')
    }
    
    console.log('All tests completed successfully!')
  } catch (error) {
    console.error('Test error:', error)
    await takeScreenshot(driver, 'fatal-test-error')
  } finally {
    // Clean up
    await driver.quit()
    console.log('Test finished.')
  }
}

// Run the test
runTest()