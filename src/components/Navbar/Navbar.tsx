'use client'

import { useState } from 'react'
import {
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  Dialog,
  DialogPanel,
} from '@headlessui/react'
import SettingsModal from './SettingsModal'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleSettingsClick = () => {
    setMobileMenuOpen(false) // close mobile if open
    setSettingsOpen(true)    // open modal
  }

  const mainLinks = [
    { name: '2D Plot', href: '/', id: '2d-plot-link', disabled: false  },
    { name: 'Matrix', href: '/matrix/', id: 'matrix-link', disabled: false  },
    { name: 'Signal-to-noise', href: '/noise', id: 'noise-link', disabled: true },
  ]
  // const settingsLink = { name: 'Settings', href: '#', id: 'settings-link' }

  return (
    <header className="bg-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between py-3 px-4 lg:px-8" aria-label="Global">
        {/* Brand */}
        <div className="flex lg:flex-1">
          <a href="javascript:location.reload()" className="-m-1.5 p-1.5">
            <span className="sr-only">JWST Precision Timing</span>
            <span className="text-lg font-semibold text-gray-900">JWST Precision Timing</span>
          </a>
        </div>

        {/* Mobile menu toggle */}
        <div className="flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="size-6" aria-hidden="true" />
          </button>
        </div>

        {/* Main nav links (center/left) */}
        <div className="hidden lg:flex lg:gap-x-12">
          {mainLinks.map((item) => (
            <a
              key={item.id}
              href={item.disabled ? '#' : item.href}
              onClick={item.disabled ? (e) => e.preventDefault() : undefined}
              className={`text-sm/6 font-semibold ${item.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900'
                }`}
              id={item.id}
            >
              {item.name}
            </a>
          ))}
        </div>

        {/* Settings (right aligned) */}
        {/* <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <a
            href={settingsLink.href}
            id={settingsLink.id}
            className="text-sm/6 font-semibold text-gray-900"
          >
            {settingsLink.name}
          </a>
        </div> */}

        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <button
            onClick={handleSettingsClick}
            id="settings-link"
            className="text-sm/6 font-semibold text-gray-900"
          >
            Settings
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <Dialog as="div" className="lg:hidden" open={mobileMenuOpen} onClose={setMobileMenuOpen}>
        <div className="fixed inset-0 z-50" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white p-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between">
            <a href="javascript:location.reload()" className="-m-1.5 p-1.5">
              <span className="sr-only">JWST Precision Timing</span>
              <span className="text-lg font-semibold text-gray-900">JWST Precision Timing</span>
            </a>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon className="size-6" aria-hidden="true" />
            </button>
          </div>

          {/* Mobile menu content */}
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-500/10">
              <div className="space-y-2 py-6">
                {[...mainLinks, { name: 'Settings', href: '#', id: 'settings-link', disabled: false }].map((item) => (
                  <a
                    key={item.id}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      if (item.disabled) return
                      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                      item.id === 'settings-link'
                        ? handleSettingsClick()
                        : setMobileMenuOpen(false)
                    }}
                    className={`-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold ${item.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>

      {/* Modal mount */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  )
}
