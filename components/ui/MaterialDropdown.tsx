'use client'
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

interface MaterialDropdownProps {
    label?: string
    value: string | number
    options: { value: string | number; label: string; icon?: any }[]
    onChange: (value: any) => void
    icon?: any
    className?: string
    width?: string
    placeholder?: string
}

export default function MaterialDropdown({
    label,
    value,
    options,
    onChange,
    icon: Icon,
    className = '',
    width = 'w-full',
    placeholder = 'Select...'
}: MaterialDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
    const [menuHeight, setMenuHeight] = useState<number>(350)
    const [position, setPosition] = useState<'bottom' | 'top'>('bottom')
    const buttonRef = useRef<HTMLButtonElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null) // Points to the wrapper div

    // Close on resize or scroll to avoid detached menus
    useEffect(() => {
        const handleResizeOrScroll = () => {
            if (isOpen) setIsOpen(false)
        }
        window.addEventListener('resize', handleResizeOrScroll)
        window.addEventListener('scroll', handleResizeOrScroll, true) // capture phase for all scrollable parents

        return () => {
            window.removeEventListener('resize', handleResizeOrScroll)
            window.removeEventListener('scroll', handleResizeOrScroll, true)
        }
    }, [isOpen])

    // Handle Outside Click (Needs to check both button and portal)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node

            // If click is inside the button (wrapper), ignore (toggle logic handles it)
            if (dropdownRef.current && dropdownRef.current.contains(target)) {
                return
            }

            // We need to check if the click was inside the Portal menu.
            // Since the Portal is not a child in DOM structure, we look up the class or ID ?
            // Better: stick a ref on the portal content if valid.
            // Or simpler: The portal content stops propagation? No, bad UX.
            // The portal div is mounted in body. We can find it by specific data attribute.
            const portalEl = document.getElementById(`dropdown-portal-${label || 'menu'}`)
            if (portalEl && portalEl.contains(target)) {
                return
            }

            setIsOpen(false)
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, label])

    // Calculate Position
    useLayoutEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            const spaceBelow = window.innerHeight - rect.bottom
            const spaceAbove = rect.top
            const minHeightNeeded = 200

            // Decide placement
            let finalTop = 0
            let finalHeight = 350
            let finalPos: 'top' | 'bottom' = 'bottom'

            if (spaceBelow < minHeightNeeded && spaceAbove > spaceBelow) {
                // Place above
                finalPos = 'top'
                finalHeight = Math.min(350, spaceAbove - 20)
                finalTop = rect.top - 8 // 8px buffer? No, we will translate -100% in CSS if needed, or calc here.
                // Actually easier: define top as rect.top and use bottom-0 in CSS? 
                // Let's set the 'bottom' coordinate of the menu to 'windowHeight - rect.top'
            } else {
                // Place below
                finalPos = 'bottom'
                finalHeight = Math.min(350, spaceBelow - 20)
                finalTop = rect.bottom + 8
            }

            setCoords({
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                width: rect.width
            } as any)

            setMenuHeight(finalHeight)
            setPosition(finalPos)
        }
    }, [isOpen])

    const selectedOption = options.find(o => o.value == value)

    return (
        <div className={`relative ${width} ${className} group/dropdown`} ref={dropdownRef}>
            {label && (
                <div className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest absolute -top-2.5 left-4 bg-[#050505] px-2 z-20 pointer-events-none group-focus-within/dropdown:text-white transition-colors">
                    {label}
                </div>
            )}

            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-zinc-900/30 hover:bg-zinc-800/50 border border-white/10 text-white py-3 md:py-4 px-5 rounded-2xl transition-all shadow-sm backdrop-blur-xl hover:border-white/20 active:scale-[0.99] h-[64px]"
            >
                <div className="flex items-center gap-3 truncate">
                    {Icon && <Icon className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />}
                    <span className={`font-bold text-sm md:text-base truncate ${!selectedOption ? 'text-zinc-500' : 'text-zinc-200'}`}>
                        {selectedOption?.label || placeholder}
                    </span>
                </div>
                <ChevronDown className={`w-5 h-5 text-zinc-600 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            {isOpen && createPortal(
                <div
                    id={`dropdown-portal-${label || 'menu'}`}
                    style={{
                        position: 'fixed',
                        left: coords.left,
                        width: coords.width,
                        top: position === 'bottom' ? coords.top + 64 + 8 : 'auto', // Button height approx 64
                        bottom: position === 'top' ? (window.innerHeight - coords.top) + 8 : 'auto',
                        maxHeight: menuHeight,
                        zIndex: 99999 // Always on top
                    }}
                    className={`
                        p-1.5 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl
                        animate-in zoom-in-95 duration-200 overflow-hidden ring-1 ring-white/5 overflow-y-auto custom-scrollbar
                        ${position === 'bottom' ? 'slide-in-from-top-2 fade-in' : 'slide-in-from-bottom-2 fade-in'}
                    `}
                >
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                onChange(option.value)
                                setIsOpen(false)
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-sm font-bold active:scale-[0.98] ${option.value == value ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {option.icon && <option.icon className={`w-4 h-4 ${option.value == value ? 'text-white' : 'text-zinc-600'}`} />}
                            <span className="flex-1 text-left">{option.label}</span>
                            {option.value == value && <Check className="w-3.5 h-3.5 text-blue-400" />}
                        </button>
                    ))}
                </div>
                , document.body)}
        </div>
    )
}
