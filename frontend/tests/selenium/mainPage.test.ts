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
 * Main page test function
 */
async function runMainPageTest() {
  console.log('Starting mainPage test...')

  // Setup Chrome options
  const options = new Options()
  options.addArguments('--start-maximized')
  options.addArguments('--disable-gpu')
  options.addArguments('--no-sandbox')

  // Create screenshots directory if it doesn't exist
  if (!fs.existsSync('screenshots/mainPage')) {
    fs.mkdirSync('screenshots/mainPage', { recursive: true })
  }

  // Initialize the WebDriver
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build()
  
  try {
    // 1. Go to homepage
    await driver.get('http://localhost:4430')
    await driver.wait(until.elementLocated(By.tagName('body')), 10000)
    await takeScreenshot(driver, 'mainpage-step-1-home')

    // 2. Switch language to French
    console.log('Switching language to French...')
    const langBtn = await driver.findElement(By.css('.lang-btn'))
    await driver.executeScript("arguments[0].click();", langBtn)
    await wait(1000) // Wait for menu to appear
    
    // Look for the language dropdown menu and find the French option
    try {
      const menuItems = await driver.findElements(By.css('.v-list-item'))
      console.log(`Found ${menuItems.length} menu items`)
      
      // Find French option by looking at all menu items
      for (const item of menuItems) {
        const text = await item.getText()
        console.log(`Menu item text: "${text}"`)
        if (text.includes('Français') || text.toLowerCase().includes('french')) {
          await driver.executeScript("arguments[0].click();", item)
          console.log('Clicked on French option')
          await wait(1000)
          await takeScreenshot(driver, 'mainpage-lang-fr')
          break
        }
      }
    } catch (error) {
      console.error('Error finding language options:', error)
      await takeScreenshot(driver, 'error-finding-language-options')
    }

    // 3. Switch language back to English
    console.log('Switching language to English...')
    await driver.executeScript("arguments[0].click();", langBtn)
    await wait(1000)
    
    try {
      const menuItems = await driver.findElements(By.css('.v-list-item'))
      
      // Find English option
      for (const item of menuItems) {
        const text = await item.getText()
        if (text.includes('English') || text.toLowerCase().includes('anglais')) {
          await driver.executeScript("arguments[0].click();", item)
          console.log('Clicked on English option')
          await wait(1000)
          await takeScreenshot(driver, 'mainpage-lang-en')
          break
        }
      }
    } catch (error) {
      console.error('Error finding language options:', error)
    }

    // 4. Look for theme toggle button - try multiple approaches
    console.log('Looking for theme toggle...')
    try {
      // First try a direct approach with the icon
      const themeBtn = await driver.findElement(
        By.css("button.v-btn--icon, .v-app-bar button, header button")
      )
      await driver.executeScript("arguments[0].click();", themeBtn)
      console.log('Clicked potential theme button')
      await wait(1000)
      await takeScreenshot(driver, 'mainpage-theme-toggled')
    } catch (error) {
      console.log('Theme button not found with first method, trying alternatives')
      
      // Try to find any button that might be a theme toggle
      try {
        const allButtons = await driver.findElements(By.css('button'))
        for (const btn of allButtons) {
          try {
            const hasIcon = await btn.findElements(By.css('i.mdi-weather-night, i.mdi-brightness-7, i.mdi-theme-light-dark'))
            if (hasIcon.length > 0) {
              await driver.executeScript("arguments[0].click();", btn)
              console.log('Found and clicked theme toggle button')
              await wait(1000)
              await takeScreenshot(driver, 'mainpage-theme-toggled')
              break
            }
          } catch (e) {
            // Continue checking next button
          }
        }
      } catch (btnError) {
        console.log('Could not find theme toggle button:', btnError)
      }
    }

    console.log('mainPage test finished successfully!')
  } catch (error) {
    console.error('Test error:', error)
    await takeScreenshot(driver, 'fatal-mainpage-test-error')
  } finally {
    await driver.quit()
  }
}

// Run the tests
runMainPageTest()