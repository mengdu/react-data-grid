import Demo1 from './Demo-1'
import Demo2 from './Demo-2'
import Guide from './Guide.mdx'

function App() {
  return (
    <div className="w-250 mx-auto">
      <div>
        <h1 className="text-9xl">React Data Grid</h1>
        <p className="text-5xl mt-3">A high-performance React data grid component.</p>
        <p className="text-sm text-gray-500 mt-3">The high-performance virtual list is implemented based on <a className="text-blue-600" href="https://tanstack.com/virtual" target="_blank">@tanstack/react-virtual</a></p>
      </div>
      <div className="mt-10">
        <Demo2 />
      </div>
      <div className="mt-10">
        <Demo1 />
      </div>
      <div className="markdown-docs mt-10">
        {/* <Readme /> */}
        <Guide />
      </div>
    </div>
  )
}

export default App
