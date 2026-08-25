import logoUrl from '@/assets/teklidi-logo.svg';

export default function ApplicationLogo(props) {
    return (
        <img
            src={logoUrl}
            alt="Teklidi Shop"
            {...props}
        />
    );
}
