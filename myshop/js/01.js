
    if (!sessionStorage.getItem('cameFromSplash')) {
        window.location.href = "index.html";
    } else {
        sessionStorage.removeItem('cameFromSplash');
    }
