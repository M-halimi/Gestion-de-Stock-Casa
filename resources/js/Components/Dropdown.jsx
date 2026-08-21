import { Link } from '@inertiajs/react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

const DropDownContext = createContext();

const Dropdown = ({ children }) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <DropDownContext.Provider value={{ open, setOpen }}>
            <div ref={rootRef} className="relative">
                {children}
            </div>
        </DropDownContext.Provider>
    );
};

const Trigger = ({ children }) => {
    const { open, setOpen } = useContext(DropDownContext);

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                setOpen((prev) => !prev);
            }}
        >
            {children}
        </div>
    );
};

const Content = ({
    align = 'right',
    width = '48',
    contentClasses = 'py-1.5 bg-canvas',
    children,
}) => {
    const { open, setOpen } = useContext(DropDownContext);

    let positioningClasses = '';

    if (align === 'left') {
        positioningClasses = 'start-0';
    } else if (align === 'right') {
        positioningClasses = 'end-0';
    } else if (align === 'up-left') {
        positioningClasses = 'bottom-full mb-2 start-0';
    } else if (align === 'up-right') {
        positioningClasses = 'bottom-full mb-2 end-0';
    }

    let widthClasses = '';

    if (width === '48') {
        widthClasses = 'w-48';
    }

    return (
        <>
            {open && (
                <div
                    className={`absolute z-50 mt-2 rounded-lg shadow-level-2 ${positioningClasses} ${widthClasses}`}
                    onClick={() => setOpen(false)}
                >
                    <div className={`rounded-lg ring-1 ring-hairline ${contentClasses}`}>
                        {children}
                    </div>
                </div>
            )}
        </>
    );
};

const DropdownLink = ({ className = '', children, ...props }) => {
    return (
        <Link
            {...props}
            className={
                'block w-full px-4 py-2 text-start text-[14px] font-normal leading-5 text-ink transition duration-150 ease-in-out hover:bg-canvas-soft focus:bg-canvas-soft focus:outline-none ' +
                className
            }
        >
            {children}
        </Link>
    );
};

Dropdown.Trigger = Trigger;
Dropdown.Content = Content;
Dropdown.Link = DropdownLink;

export default Dropdown;