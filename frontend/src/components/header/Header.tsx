import React, { useState } from 'react';
import PropagateLoader from 'react-spinners/PropagateLoader';

/* Components */
import './Header.css';
import profileIcon from '../../assets/icons/profile.svg';
import SearchInput from '../search/Search';
import addIcon from '../../assets/icons/addIcon.svg';
import SignInPopup from '../signup/Signup';

/* Hooks */
import useWebSocket from '../../services/WebSocketConnect/WebSocketConnect';

const Header: React.FC = () => {
    const [isSignInVisible, setIsSignInVisible] = useState(false);
    const [isConnectionPopupVisible, setIsConnectionPopupVisible] = useState(false);
    
    const { isConnected, status, statusMessage } = useWebSocket('ws://localhost:5432', {
        pingInterval: 30000,
        connectionTimeout: 5000
    });

    const toggleConnectionPopup = () => {
        setIsConnectionPopupVisible(!isConnectionPopupVisible);
    };

    const toggleSignInPopup = () => {
        setIsSignInVisible(!isSignInVisible);
    };

    const getStatusColor = () => {
        switch (status) {
            case 'connected':
                return 'text-green-600';
            case 'failed':
            case 'timeout':
                return 'text-red-600';
            case 'disconnected':
                return 'text-orange-600';
            default:
                return 'text-gray-600';
        }
    };

    return (
        <>
            <header className="header">
                <SearchInput />
                <img
                    src={profileIcon}
                    alt="Profile"
                    className="profile-icon"
                    onClick={toggleSignInPopup}
                />
                <img
                    src={addIcon}
                    alt="Add"
                    className="add-icon"
                    onClick={toggleConnectionPopup}
                />
            </header>

            {isConnectionPopupVisible && (
                <div className="popup-overlay" onClick={toggleConnectionPopup}>
                    <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                        <h2>New Project</h2>
                        <p className={getStatusColor()}>{statusMessage}</p>
                        {status === 'connecting' && <PropagateLoader data-testid={'loader'}/>}
                    </div>
                </div>
            )}

            <SignInPopup isVisible={isSignInVisible} onClose={toggleSignInPopup} />
        </>
    );
};

export default Header;