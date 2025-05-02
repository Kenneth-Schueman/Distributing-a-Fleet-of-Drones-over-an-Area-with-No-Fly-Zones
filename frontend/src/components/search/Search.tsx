import searchIcon from '../../assets/icons/search.svg';
import './Search.css';

const SearchInput = () => {
    return (
      <div className="form-control">
        <div className="input-container">
          <span className="input-prefix">
            <img src={searchIcon} alt="Search Icon" className="search-icon" />
          </span>
  
          <input
            id="input"
            className="input-control"
            aria-describedby="help-text"
            type="text"
            placeholder="Search for a location"
            autoComplete="off"
            spellCheck="true"
          />
  
          <span className="input-suffix">
            {/* Slot for suffix content */}
          </span>
        </div>
      </div>
    );
  };
  
  export default SearchInput;
