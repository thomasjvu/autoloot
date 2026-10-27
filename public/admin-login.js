import {normalizeUsername,passwordError,PASSWORD_HINT,USERNAME_PATTERN} from './admin-credentials.js';

const $=selector=>document.querySelector(selector);
const form=$('form'),status=$('#auth-status'),button=$('#auth-submit');
const {username,password,confirm}=form.elements;
let setup=false;
let ready=false;

function validate() {
  username.setCustomValidity('');password.setCustomValidity('');confirm.setCustomValidity('');
  if(setup){
    if(username.value){try{normalizeUsername(username.value);}catch(error){username.setCustomValidity(error.message);}}
    if(password.value)password.setCustomValidity(passwordError(password.value));
    if(confirm.value && password.value!==confirm.value)confirm.setCustomValidity('Passwords do not match.');
  }
}
form.addEventListener('input',()=>{validate();status.textContent='';});
try {
  const response=await fetch('/api/admin/status'),account=await response.json();
  if(!response.ok)throw Error(account.error);
  if(account.authenticated)location.replace('/');
  setup=!account.configured;
  const legacy=!setup && account.legacyPasswordOnly;
  $('#auth-title').textContent=setup?'Make yourself at home.':'Welcome back.';
  $('#auth-description').textContent=setup?'Create your admin account.':'Sign in to your workspace.';
  $('#username-label').hidden=legacy;username.required=!legacy;username.disabled=legacy;
  username.pattern=USERNAME_PATTERN;
  $('#username-hint').hidden=!setup;
  password.autocomplete=setup?'new-password':'current-password';password.minLength=setup?12:1;
  $('#confirm-label').hidden=!setup;confirm.required=setup;
  $('#password-hint').hidden=!setup;$('#password-hint').textContent=PASSWORD_HINT;
  $('#legacy-login-note').hidden=!legacy;
  button.innerHTML=(setup?'Create my workspace':'Sign in')+' <span aria-hidden="true">↗</span>';
  ready=true;button.disabled=false;
} catch(error) {status.textContent=error.message;button.disabled=true;}

form.onsubmit=async event=>{
  event.preventDefault();if(!ready)return;
  validate();if(!form.reportValidity())return;
  button.disabled=true;
  try {
    const response=await fetch('/api/admin/'+(setup?'setup':'login'),{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username:username.disabled?undefined:username.value,password:password.value}),
    });
    const result=await response.json();if(!response.ok)throw Error(result.error);
    form.reset();location.replace('/');
  } catch(error) {status.textContent=error.message;button.disabled=false;}
};
$('#show-password').onclick=event=>{
  const show=password.type==='password';password.type=show?'text':'password';confirm.type=show?'text':'password';
  event.currentTarget.textContent=show?'Hide':'Show';
  event.currentTarget.setAttribute('aria-label',show?'Hide passwords':'Show passwords');
  event.currentTarget.setAttribute('aria-pressed',String(show));
};
