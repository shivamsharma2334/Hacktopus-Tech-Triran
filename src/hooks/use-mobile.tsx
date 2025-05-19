"use client"

import * as React from "react"

/** Tailwind default breakpoint value for `md`. */
const MD = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(true)

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MD)
    }

    handleResize() // Call initially to set the state based on the initial window size
    window.addEventListener("resize", handleResize)

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return isMobile
}
