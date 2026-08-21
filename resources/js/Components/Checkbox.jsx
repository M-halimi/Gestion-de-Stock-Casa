export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-hairline-input bg-canvas text-primary shadow-sm focus:ring-primary ' +
                className
            }
        />
    );
}
