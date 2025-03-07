document.addEventListener('DOMContentLoaded', () => {
  document.body.append(
    Object.assign(document.createElement('p'), {
      textContent: `This is the text from ${import.meta.env.VITE_BUILD_TARGET}`,
    }),
  )
})
