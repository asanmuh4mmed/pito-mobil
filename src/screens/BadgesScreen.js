// Compatibility redirect for any legacy route still importing this module.
import { useEffect } from 'react';
export default function BadgesScreen({ navigation }) {
    useEffect(() => {
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.replace('Profile');
    }, [navigation]);
    return null;
}
