import { EyeOff, Eye } from "lucide-react";
import { useState } from "react";
import "./Signup.css";

interface SignInPopupProps {
    isVisible: boolean;
    onClose: () => void;
}

const SignInPopup: React.FC<SignInPopupProps> = ({ isVisible, onClose }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        setError('');
        console.log('Sign in attempt with:', { email });
    };

    if (!isVisible) return null;

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                <div className="signin-container">
                    <h2 className="signin-title">Sign In</h2>
                    
                    <form onSubmit={handleSubmit} className="signin-form">
                        {error && <div className="error-message">{error}</div>}
                        
                        <div className="form-field">
                            <label htmlFor="email" className="field-label">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="password" className="field-label">Password</label>
                            <div className="password-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="password-toggle"
                                >
                                    {showPassword ? (
                                        <EyeOff className="toggle-icon" />
                                    ) : (
                                        <Eye className="toggle-icon" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="submit-button">
                            Sign In
                        </button>

                        <div className="links-container">
                            <button type="button" className="link-button">
                                Forgot password?
                            </button>
                            <button type="button" className="link-button">
                                Create account
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SignInPopup;