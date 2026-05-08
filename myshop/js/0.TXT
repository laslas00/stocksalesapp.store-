
    if (!sessionStorage.getItem('cameFromSplash')) {
        window.location.href = "main.html";
    } else {
        sessionStorage.removeItem('cameFromSplash');
    }
