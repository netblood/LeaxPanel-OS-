const socket = io();

socket.on('connect', () => {
  console.log('Connected to LEAXOS WebSocket');
});

socket.on('disconnect', () => {
  console.log('Disconnected from LEAXOS WebSocket');
});

document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Processing...';
      }
    });
  });
});
