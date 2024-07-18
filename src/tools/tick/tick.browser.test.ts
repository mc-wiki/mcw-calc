import { render, screen } from '@testing-library/vue'
import { userEvent } from '@vitest/browser/context'
import App from '@/tools/tick/App.vue'

describe('App.vue', () => {
  it('renders the component', () => {
    render(App)

    expect(screen.getByText('tick.title')).toBeInTheDocument()
  })

  it('have initial 0 tick', async () => {
    const { container } = render(App)
    container.querySelectorAll('input').forEach((input) => {
      expect(input).toHaveValue(0)
    })
  })

  it('should compute correctly', async () => {
    const { container } = render(App)

    const gt = container.querySelector('#gt input')!
    const rt = container.querySelector('#rt input')!
    const day = container.querySelector('#day input')!
    const hour = container.querySelector('#hour input')!
    const minute = container.querySelector('#minute input')!
    const second = container.querySelector('#second input')!
    const millisecond = container.querySelector('#millisecond input')!

    await userEvent.type(gt, '1')
    expect(rt).toHaveValue(0.5)
    expect(day).toHaveValue(0)
    expect(hour).toHaveValue(0)
    expect(minute).toHaveValue(0)
    expect(second).toHaveValue(0)
    expect(millisecond).toHaveValue(50)

    await userEvent.clear(gt)
    await userEvent.type(gt, '10000002')
    expect(rt).toHaveValue(5000001)
    expect(day).toHaveValue(5)
    expect(hour).toHaveValue(18)
    expect(minute).toHaveValue(53)
    expect(second).toHaveValue(20)
    expect(millisecond).toHaveValue(100)
  })

  it('should compute correctly with setters', async () => {
    const { container } = render(App)

    const gt = container.querySelector('#gt input')!
    const rt = container.querySelector('#rt input')!
    const day = container.querySelector('#day input')!
    const hour = container.querySelector('#hour input')!
    const minute = container.querySelector('#minute input')!
    const second = container.querySelector('#second input')!
    const millisecond = container.querySelector('#millisecond input')!

    await userEvent.type(rt, '5000001')
    expect(gt).toHaveValue(10000002)
    expect(day).toHaveValue(5)
    expect(hour).toHaveValue(18)
    expect(minute).toHaveValue(53)
    expect(second).toHaveValue(20)
    expect(millisecond).toHaveValue(100)
  })

  it('should compute correctly with setters when it overflows', async () => {
    const { container } = render(App)

    const gt = container.querySelector('#gt input')!
    const rt = container.querySelector('#rt input')!
    const day = container.querySelector('#day input')!
    const hour = container.querySelector('#hour input')!
    const minute = container.querySelector('#minute input')!
    const second = container.querySelector('#second input')!
    const millisecond = container.querySelector('#millisecond input')!

    await userEvent.type(second, '60')
    expect(gt).toHaveValue(1200)
    expect(rt).toHaveValue(600)
    expect(day).toHaveValue(0)
    expect(hour).toHaveValue(0)
    expect(minute).toHaveValue(1)
    expect(second).toHaveValue(0)
    expect(millisecond).toHaveValue(0)
  })
})
