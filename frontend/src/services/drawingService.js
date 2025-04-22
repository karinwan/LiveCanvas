import axios from 'axios'

export const useDrawingService = () => {
  // Change to match your Flask backend port
  const API_URL = 'http://127.0.0.1:5000'

  const saveDrawing = async (imageData) => {
    try {
      console.log('Attempting to save drawing...')
      const response = await axios.post(`${API_URL}/api/drawings`, {
        imageData: imageData
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      console.log('Save drawing response:', response)
      return response.data
    } catch (error) {
      console.error('Error saving drawing:', error.response || error)
      throw error
    }
  }

  return {
    saveDrawing
  }
}
