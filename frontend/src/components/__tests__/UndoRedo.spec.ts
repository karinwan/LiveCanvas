import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import UndoRedo from '@/components/UndoRedoControl.vue'; // Update with actual path
import { createVuetify } from 'vuetify';

const vuetifyInstance = createVuetify();

describe('UndoRedo', () => {
  it('emits undo event when undo button is clicked', async () => {
    const wrapper = mount(UndoRedo, {
      global: {
        plugins: [vuetifyInstance],
      },
    });

    // Find the undo button by test ID and trigger a click
    const undoButton = wrapper.find('[data-testid="undo-button"]');
    await undoButton.trigger('click');
    
    // Assert that the undo event was emitted
    expect(wrapper.emitted('undo')).toBeTruthy();
  });

  it('emits redo event when redo button is clicked', async () => {
    const wrapper = mount(UndoRedo, {
      global: {
        plugins: [vuetifyInstance],
      },
    });

    // Find the redo button by test ID and trigger a click
    const redoButton = wrapper.find('[data-testid="redo-button"]');
    await redoButton.trigger('click');
    
    // Assert that the redo event was emitted
    expect(wrapper.emitted('redo')).toBeTruthy();
  });
});
