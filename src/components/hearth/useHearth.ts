import { useContext } from 'react';
import { HearthContext, type HearthApi } from './hearthContext';

// Gives a component access to the hearth effects
// Throws straight away when there is no HearthProvider above it, so the mistake shows up on first render instead of as a silent no-op
export function useHearth(): HearthApi {
    const hearth = useContext(HearthContext);
    if (!hearth) {
        throw new Error('useHearth must be used inside a HearthProvider');
    }
    return hearth;
}
