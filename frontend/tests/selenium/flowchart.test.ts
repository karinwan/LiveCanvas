import { Builder, By, until } from 'selenium-webdriver'
import { Options } from 'selenium-webdriver/chrome'

const fs = require('fs')
const path = require('path');

async function takeScreenshot(driver, stepName: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dir = path.join('screenshots', 'flowChart')
    const filename = path.join(dir, `${stepName}-${timestamp}.png`)
  
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  
    const screenshot = await driver.takeScreenshot()
    fs.writeFileSync(filename, screenshot, 'base64')
    console.log(`Saved screenshot: ${filename}`)
  }
  
  


async function selectTemplateAndVerify(driver, labelKeyword: string, stepName: string) {
  const templateCards = await driver.wait(until.elementsLocated(By.css('.template-card')), 5000)
  let selectedCard = null
  for (const card of templateCards) {
    const title = await card.findElement(By.css('.v-card-title'))
    const text = (await title.getText()).trim().toLowerCase()
    if (text.includes(labelKeyword)) {
      selectedCard = card
      break
    }
  }
  if (!selectedCard) throw new Error(`Template card '${labelKeyword}' not found`)
  await driver.executeScript("arguments[0].click();", selectedCard)
  console.log(`Selected template: ${labelKeyword}`)
  await takeScreenshot(driver, `template-${stepName}-selected`)
  await driver.wait(until.elementsLocated(By.css('.vue-flow__node')), 3000)
  const templateNodes = await driver.findElements(By.css('.vue-flow__node'))
  console.log(`Template '${labelKeyword}' has ${templateNodes.length} nodes`)
  await takeScreenshot(driver, `template-${stepName}-nodes-added`)
}


async function openSidebar(driver) {
    const sidebarBtn = await driver.findElement(By.css('.sidebar-container .v-btn'))
    await driver.executeScript("arguments[0].click();", sidebarBtn)
    await driver.sleep(300)
  }
  
  async function clickSidebarSubmenu(driver, parentLabelSubstr: string, subItemLabelSubstr: string, screenshotLabel: string) {
    await openSidebar(driver)
  
    const parentItems = await driver.findElements(By.css('.v-list-item-title'))
    let parentFound = null
  
    for (const item of parentItems) {
      const text = (await item.getText()).trim().toLowerCase()
      if (text.includes(parentLabelSubstr.toLowerCase())) {
        parentFound = item
        break
      }
    }
  
    if (!parentFound) throw new Error(`Could not find parent menu containing: ${parentLabelSubstr}`)
  
    const parentContainer = await parentFound.findElement(By.xpath('./ancestor::div[contains(@class, "v-list-item")]'))
    await driver.actions().move({ origin: parentContainer }).perform()
    await driver.sleep(400)
  
    const allItems = await driver.findElements(By.css('body .v-overlay .v-list-item'))
    let matched = false
    for (const item of allItems) {
      const text = (await item.getText()).trim().toLowerCase()
      console.log('Visible submenu item:', text) 
      if (text.includes(subItemLabelSubstr.toLowerCase())) {
        await item.click()
        matched = true
        break
      }
    }
  
    if (!matched) throw new Error(`Could not find submenu item containing: ${subItemLabelSubstr}`)
  
    await driver.sleep(1000)
    await takeScreenshot(driver, screenshotLabel)
  }
  
  
  
async function runTest() {
  console.log('Starting flowchart test...')
  const options = new Options()
  options.addArguments('--start-maximized')

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build()

  try {
    if (!fs.existsSync('screenshots')) {
      fs.mkdirSync('screenshots')
    }

    // Step 1–8: Setup
    await driver.get('http://localhost:4430')
    await driver.wait(until.elementLocated(By.css('.option-box')), 5000)
    await takeScreenshot(driver, 'step-1-homepage')

    const flowchartButton = await driver.findElement(
      By.xpath("//div[contains(@class, 'option-box')]//p[contains(text(), 'Create Flow Chart')]")
    )
    await flowchartButton.click()
    await takeScreenshot(driver, 'step-2-click-create-flowchart')

    await driver.wait(until.urlContains('/flowchart/'), 5000)
    await takeScreenshot(driver, 'step-3-redirected')

    const url = await driver.getCurrentUrl()
    const roomId = url.split('/').pop()
    console.log('Created Room ID:', roomId)

    const inputField = await driver.wait(
      until.elementLocated(By.xpath("//input[@type='text']")),
      10000
    )
    await inputField.sendKeys('test-user')
    await takeScreenshot(driver, 'step-4-enter-username')

    const allButtons = await driver.findElements(By.css('.v-btn'))
    let joinButton = null
    for (const btn of allButtons) {
      const text = await btn.getText()
      if (text.trim().toLowerCase() === 'join') {
        joinButton = btn
        break
      }
    }
    if (!joinButton) throw new Error('Join button not found!')
    await driver.executeScript("arguments[0].click();", joinButton)
    await takeScreenshot(driver, 'step-5-click-join')

    await driver.wait(until.elementLocated(By.css('.vue-flow-basic-example')), 10000)
    await takeScreenshot(driver, 'step-6-canvas-loaded')

    const btns = await driver.findElements(By.css('.v-btn'))
    let addNodeBtn = null
    for (const btn of btns) {
      const text = (await btn.getText()).trim().toLowerCase()
      if (text === 'add node') {
        addNodeBtn = btn
        break
      }
    }
    if (!addNodeBtn) throw new Error('Add Node button not found!')
    await driver.executeScript("arguments[0].click();", addNodeBtn)
    await takeScreenshot(driver, 'step-7-click-add-node')

    await driver.wait(until.elementLocated(By.css('.vue-flow__node')), 3000)
    const nodes = await driver.findElements(By.css('.vue-flow__node'))
    await takeScreenshot(driver, 'step-8-node-added')

// Step 8.5: Edit node label after adding
console.log('Testing node text editing immediately after Add Node...')


await driver.executeScript(`
  const node = document.querySelector('.vue-flow__node');
  if (!node) throw new Error('Node not found');
  const evt = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
  node.dispatchEvent(evt);
`)
await takeScreenshot(driver, 'step-8.5-node-edit-mode')


const inputSelector = '.vue-flow__node input'
await driver.wait(until.elementLocated(By.css(inputSelector)), 3000)
await driver.sleep(300) 


await driver.executeScript(`
  const input = document.querySelector('${inputSelector}');
  if (input) {
    input.value = 'Modified Node Text';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  }
`)
await driver.sleep(300)
await takeScreenshot(driver, 'step-8.6-node-label-updated')



const updatedNode = await driver.findElement(By.css('.vue-flow__node'))
const updatedText = await updatedNode.getText()
console.log('[node text]', updatedText)

if (!updatedText.includes('Modified Node Text')) {
  throw new Error('Node label did not update as expected!')
}
console.log('Node label updated successfully!')









    // Step 9: Click Import Templates
    let importBtn = null
    for (const btn of btns) {
      const text = (await btn.getText()).trim().toLowerCase()
      if (text === 'import templates') {
        importBtn = btn
        break
      }
    }
    if (!importBtn) throw new Error('Import Template button not found!')
    await driver.executeScript("arguments[0].click();", importBtn)
    await takeScreenshot(driver, 'step-9-open-template-dialog')

    // Step 10–13: Select all 4 templates
    await selectTemplateAndVerify(driver, 'simple process', 'simple')
    await driver.sleep(500) 
    await driver.executeScript("arguments[0].click();", importBtn)
    await driver.wait(until.elementLocated(By.css('.template-card')), 5000)    
    await selectTemplateAndVerify(driver, 'kanban', 'kanban')
    await driver.sleep(500) 
    await driver.executeScript("arguments[0].click();", importBtn)
    await driver.wait(until.elementLocated(By.css('.template-card')), 5000)    
    await selectTemplateAndVerify(driver, 'mind map', 'mindmap')
    await driver.sleep(500) 
    await driver.executeScript("arguments[0].click();", importBtn)
    await driver.wait(until.elementLocated(By.css('.template-card')), 5000)    
    await selectTemplateAndVerify(driver, 'decision flowchart', 'decision')


    // Step 14: Go back to homepage and rejoin using room ID
    await driver.get('http://localhost:4430')
    await takeScreenshot(driver, 'step-14-back-to-homepage')


    const freshInputBox = await driver.wait(
    until.elementLocated(By.css('input[type="text"]')),
    5000
    )
    await freshInputBox.clear()
    await freshInputBox.sendKeys(roomId)
    await takeScreenshot(driver, 'step-15-enter-room-id')


    const allButtons2 = await driver.findElements(By.css('.v-btn'))
    let joinRoomBtn = null
    for (const btn of allButtons2) {
    const text = (await btn.getText()).trim().toLowerCase()
    if (text.includes('join room')) {
        joinRoomBtn = btn
        break
    }
    }
    if (!joinRoomBtn) throw new Error('Join Room button not found!')
    await driver.executeScript("arguments[0].click();", joinRoomBtn)
    await takeScreenshot(driver, 'step-16-click-join-room')


    await driver.wait(until.urlContains(`/flowchart/${roomId}`), 5000)
    await takeScreenshot(driver, 'step-17-redirected-back-to-room')

    await driver.wait(until.elementLocated(By.css('.vue-flow-basic-example')), 5000)
    await takeScreenshot(driver, 'step-18-final-room-loaded')

    // Step 19: Toggle Sidebar
    const sidebarButton = await driver.findElement(By.css('.sidebar-container .v-btn'));
    await driver.executeScript("arguments[0].click();", sidebarButton);
    await takeScreenshot(driver, 'step-19-sidebar-opened');

    // Step 20: Toggle Dark Mode
    const darkModeSwitch = await driver.wait(until.elementLocated(By.css('.v-switch input')), 5000);
    await driver.executeScript("arguments[0].click();", darkModeSwitch);
    await takeScreenshot(driver, 'step-20-dark-mode-toggled');

    // Step 21: Switch Language (to French)

    const languageMenuActivator = await driver.findElement(
        By.xpath("//div[contains(text(), 'Language')]/ancestor::div[contains(@class, 'v-list-item')]")
    )
    await driver.actions().move({ origin: languageMenuActivator }).perform()
    await driver.sleep(800) 
    
  
    const allVisibleMenus = await driver.findElements(By.css('body .v-overlay .v-list-item'))
    let found = false
    
    for (const item of allVisibleMenus) {
        const text = (await item.getText()).trim().toLowerCase()
        console.log('Menu item found:', text)
        if (text === 'french') {
        await item.click()
        found = true
        break
        }
    }
    
    if (!found) throw new Error('French language option not found')
    
    await takeScreenshot(driver, 'step-21-language-switched-fr')
  
      


    const allButtonSpans = await driver.findElements(By.css('.v-btn__content'))
    found = false
    
    for (const span of allButtonSpans) {
      const text = (await span.getText()).trim().toLowerCase()
      console.log('Button text found:', text)
      if (text.includes('ajouter') || text.includes('node')) {
        console.log(`Matched translated 'Add Node' button: ${text}`)
        await takeScreenshot(driver, 'step-22-lang-check-addnode-text')
        found = true
        break
      }
    }
    
    if (!found) {
      throw new Error('Add Node button not found after language switch')
    }
    
    
    // Step 23: Add another node (after language switch)
    const updatedBtns = await driver.findElements(By.css('.v-btn'))
    let newAddNodeBtn = null
    for (const btn of updatedBtns) {
    const text = (await btn.getText()).trim().toLowerCase()
    if (text.includes('ajouter') || text.includes('node')) {
        newAddNodeBtn = btn
        break
    }
    }
    if (!newAddNodeBtn) throw new Error('Cannot find "Add Node" button after language switch')
    await driver.executeScript("arguments[0].click();", newAddNodeBtn)
    await takeScreenshot(driver, 'step-23-add-node-again')


    // Step 24: Export to Image
    await clickSidebarSubmenu(driver,'Export', 'image (.png)', 'step-24-export-image')

    // Step 25: Export to PDF
    await clickSidebarSubmenu(driver,'Export', 'pdf', 'step-25-export-pdf')

    // Step 26: Export to JSON
    await clickSidebarSubmenu(driver, 'export', 'json', 'step-26-export-json') 


    // Step 27: Open JSON file
    await openSidebar(driver)

    const menuItems = await driver.findElements(By.css('.v-list-item-title'))
    let openMenuItem = null

    for (const item of menuItems) {
    const text = (await item.getText()).trim().toLowerCase()
    if (text.includes('open') || text.includes('ouvrir')) {
        openMenuItem = item
        break
    }
    }

    if (!openMenuItem) {
    throw new Error('Open menu item not found in any language')
    }

    const openBtn = await openMenuItem.findElement(
    By.xpath('./ancestor::div[contains(@class, "v-list-item")]')
    )
    await driver.executeScript("arguments[0].click();", openBtn)
    await takeScreenshot(driver, 'step-27-open-json-click')


    // Step 28: Interact with file picker
    const [fileChooser] = await Promise.all([
    driver.wait(() => (driver as any).switchTo().activeElement(), 3000),
    driver.executeScript(`
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.onchange = () => input.remove();
        input.click();
        return input;
    `)
    ])

    const fileInput = await driver.findElement(By.css('input[type="file"]'))
    const jsonPath = '/Users/jinlingli/Downloads/flowchart.json'
    if (!fs.existsSync(jsonPath)) throw new Error(`File not found at: ${jsonPath}`)
    await fileInput.sendKeys(jsonPath)

    await takeScreenshot(driver, 'step-28-json-file-selected')

    // Step 29: Wait for canvas reload (after opening JSON)
    await driver.wait(until.elementLocated(By.css('.vue-flow__node')), 5000)
    await takeScreenshot(driver, 'step-29-json-loaded')

    // Step 30: Modify room name
    await openSidebar(driver) 
    await driver.sleep(500)


    const header = await driver.findElement(By.css('.room-name-text'))
    await driver.executeScript("arguments[0].click();", header)
    await driver.sleep(300) 


    const input = await driver.wait(until.elementLocated(By.css('.room-name-input')), 3000)
    await input.clear()
    await input.sendKeys('My Test Room Name')
    await input.sendKeys('\n') 
    await takeScreenshot(driver, 'step-30-room-name-modified')

    console.log('Room name input modified successfully.')



    const controls = await driver.findElement(By.css('.vue-flow__controls'));
    const controlButtons = await controls.findElements(By.css('button'));
    
    const zoomInBtn = controlButtons[0];  // zoom in
    const zoomOutBtn = controlButtons[1]; // zoom out
    
    await zoomInBtn.click();
    await driver.sleep(500);
    await takeScreenshot(driver, 'step-31-zoom-in');
    
    await zoomOutBtn.click();
    await driver.sleep(500);
    await takeScreenshot(driver, 'step-32-zoom-out');
    

    
  







  } catch (error) {
    console.error('Test error:', error)
    await takeScreenshot(driver, 'error')
  } finally {
    await driver.quit()
    console.log('Test finished.')
  }
}

runTest()

