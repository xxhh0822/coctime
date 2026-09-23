import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import App from './App.vue'

describe('App', () => {
  it('loads the anonymous example and renders all upgrade tasks', async () => {
    const wrapper = mount(App)
    await wrapper.get('.import-button').trigger('click')
    const exampleButton = wrapper.findAll('button').find((button) => button.text() === '载入示例')

    await exampleButton?.trigger('click')

    expect(wrapper.text()).toContain('#DEMO')
    expect(wrapper.get('#main-world').text()).toContain('8 项升级')
    expect(wrapper.get('#builder-world').text()).toContain('3 项升级')
    expect(wrapper.text()).toContain('Wizard')
    expect(wrapper.text()).toContain('预计节省2天')
    expect(wrapper.findAll('.entity-glyph')).toHaveLength(11)
  })

  it('shows a validation error without uploading or discarding the input', async () => {
    const wrapper = mount(App)
    await wrapper.get('.import-button').trigger('click')
    const textarea = wrapper.get('textarea')
    await textarea.setValue('{broken')
    await wrapper.get('.import-modal .primary-button').trigger('click')

    expect(wrapper.get('[role="alert"]').text()).toContain('JSON 格式不正确')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('{broken')
  })

  it('opens assistant details and shows the assigned upgrade items', async () => {
    const wrapper = mount(App)
    await wrapper.get('.import-button').trigger('click')
    const exampleButton = wrapper.findAll('button').find((button) => button.text() === '载入示例')
    await exampleButton?.trigger('click')

    await wrapper.get('.helper-button').trigger('click')

    const dialog = wrapper.get('[aria-labelledby="helper-title"]')
    expect(dialog.text()).toContain('建筑工人学徒')
    expect(dialog.text()).toContain('Bomb')
    expect(dialog.text()).toContain('实验室助手')
    expect(dialog.text()).toContain('Wizard')
    expect(dialog.findAll('.entity-glyph')).toHaveLength(2)
  })
})
