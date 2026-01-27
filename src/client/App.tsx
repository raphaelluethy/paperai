/* @jsxImportSource solid-js */
import { render } from "solid-js/web"
import { Router, Route } from "@solidjs/router"
import { MainApp } from "./pages/MainApp.tsx"
import { NotFound } from "./pages/NotFound.tsx"

function App() {
  return (
    <Router>
      <Route path="/" component={MainApp} />
      <Route path="*404" component={NotFound} />
    </Router>
  )
}

render(() => <App />, document.getElementById("app")!)
