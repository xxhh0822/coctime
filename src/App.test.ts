import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import App from './App.vue'

describe('App', () => {
  it('loads the anonymous example and renders all upgrade tasks', async () => {
    const wrapper = mount(App)
    const exampleButton = wrapper.findAll('button').find((button) => button.text() === '示例')

    await exampleButton?.trigger('click')

    expect(wrapper.text()).toContain('#DEMO')
    expect(wrapper.text()).toContain('升级项目 (11)')
    expect(wrapper.text()).toContain('Wizard')
    expect(wrapper.text()).toContain('预计节省2天')
  })

  it('shows a validation error without uploading or discarding the input', async () => {
    const wrapper = mount(App)
    const textarea = wrapper.get('textarea')
    await textarea.setValue('{broken')
    await wrapper.get('.primary-button').trigger('click')

    expect(wrapper.get('[role="alert"]').text()).toContain('JSON 格式不正确')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('{broken')
  })
})
