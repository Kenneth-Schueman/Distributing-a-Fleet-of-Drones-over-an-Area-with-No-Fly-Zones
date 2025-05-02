import { Home, Map, MapPin, Navigation, ClipboardList, Info, Target } from 'lucide-react';
import droneIcon from '../../assets/icons/drone2.svg';
import './Nav.css'


const NavigationMenu = () => {
    const navItems = [
        { icon: Home, label: 'Home', href: '/', id: 'home' },
        { icon: Map, label: 'Discover', href: '/discover', id: 'discover' },
        { icon: MapPin, label: 'Plan', href: '/plan', id: 'plan' },
        { icon: Navigation, label: 'Operate', href: '/operate', id: 'operate' },
        // { icon: ClipboardList, label: 'Manage', href: '/manage', id: 'manage' },
        { icon: Target, label: 'Create Targets', href: '/create-targets', id: 'create-targets' },
        { icon: Info, label: 'About', href: '/about', id: 'about' }
    ];

    return (
        <div className="nav-wrapper">
            <nav className="nav-container">
                    <a href="/" className="nav-item" data-testid="drone-link">
                        <img src={droneIcon} alt="Drone" className="home-icon" />
                    </a>
                {navItems.map(({ icon: Icon, label, href, id }) => (
                        <a
                            key={id}
                            href={href}
                            className={`nav-item ${id === 'about' ? 'about-item' : ''}`}
                            data-testid={`${id}-link`}
                        >
                            <Icon className="nav-icon" />
                            <span className="nav-label">{label}</span>
                        </a>
                ))}
            </nav>

        </div>
    );
};

export default NavigationMenu;