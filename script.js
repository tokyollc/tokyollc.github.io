const menuButton=document.querySelector('.menub'),nav=document.querySelector('nav'),chat=document.querySelector('.chat');
menuButton.addEventListener('click',()=>{nav.classList.toggle('open');menuButton.textContent=nav.classList.contains('open')?'Close':'Menu'});
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
function toggleChat(force){chat.hidden=force===false?true:force===true?false:!chat.hidden}
document.querySelector('.chatlaunch').addEventListener('click',()=>toggleChat());document.querySelector('.chatlink').addEventListener('click',()=>toggleChat(true));document.querySelector('.chathead button').addEventListener('click',()=>toggleChat(false));document.querySelectorAll('.chatbody a').forEach(a=>a.addEventListener('click',()=>toggleChat(false)));
document.getElementById('year').textContent=new Date().getFullYear();
document.getElementById('contact-form').addEventListener('submit',e=>{e.preventDefault();const d=new FormData(e.target),subject=encodeURIComponent(`Service inquiry from ${d.get('name')}`),body=encodeURIComponent(`Name: ${d.get('name')}\nEmail: ${d.get('email')}\nPhone: ${d.get('phone')||'Not provided'}\nService: ${d.get('service')}\n\n${d.get('message')}`);location.href=`mailto:info@tokyollc.com?subject=${subject}&body=${body}`});
