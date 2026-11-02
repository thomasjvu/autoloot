import {icon} from './icons.js';
import {normalizeUsername,passwordError,PASSWORD_HINT,USERNAME_PATTERN,passwordChecks} from './admin-credentials.js';

const $=selector=>document.querySelector(selector);
const form=$('form'),status=$('#auth-status'),button=$('#auth-submit');
const {username,password}=form.elements;
let setup=false;
let ready=false;

function updatePasswordMeter() {
  if(!setup)return;
  const checks=passwordChecks(password.value),score=checks.filter(check=>check.met).length;
  const label=!password.value?'Add a password':score===5?'Ready':score>=3?'Almost there':'Needs work';
  const meter=$('#password-meter');
  meter.dataset.level=score===5?'ready':score>=3?'almost':'low';
  meter.setAttribute('aria-valuenow',String(score));
  meter.setAttribute('aria-valuetext',`${score} of 5 requirements met`);
  [...meter.children].forEach((segment,index)=>segment.classList.toggle('filled',index<score));
  $('#password-strength-label').textContent=label;
  $('#password-hint').textContent=!password.value?PASSWORD_HINT:score===5?'All requirements met.':`Still needs ${checks.filter(check=>!check.met).map(check=>check.label).join(', ')}.`;
}
function validate() {
  updatePasswordMeter();
  username.setCustomValidity('');password.setCustomValidity('');
  if(setup){
    if(username.value){try{normalizeUsername(username.value);}catch(error){username.setCustomValidity(error.message);}}
    if(password.value)password.setCustomValidity(passwordError(password.value));
  }
}
form.addEventListener('input',()=>{validate();status.textContent='';});
try {
  const response=await fetch('/api/admin/status'),account=await response.json();
  if(!response.ok)throw Error(account.error);
  if(account.authenticated)location.replace('/');
  setup=!account.configured;
  $('#twitch-admin-login').hidden=!account.twitchSignIn;
  const legacy=!setup && account.legacyPasswordOnly;
  $('#auth-title').textContent=setup?'Create account':'Welcome back.';
  $('#username-label').hidden=legacy;username.required=!legacy;username.disabled=legacy;
  username.pattern=USERNAME_PATTERN;
  $('#username-hint').hidden=!setup;
  password.autocomplete=setup?'new-password':'current-password';password.minLength=setup?12:1;
  $('#password-strength').hidden=!setup;updatePasswordMeter();
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
      body:JSON.stringify({username:username.disabled?undefined:username.value,password:password.value,remember:form.elements.remember.checked}),
    });
    const result=await response.json();if(!response.ok)throw Error(result.error);
    form.reset();location.replace('/');
  } catch(error) {status.textContent=error.message;button.disabled=false;}
};
$('#show-password').onclick=event=>{
  const show=password.type==='password';password.type=show?'text':'password';
  event.currentTarget.innerHTML=icon(show?'eye-off':'eye',20);
  event.currentTarget.setAttribute('aria-label',show?'Hide password':'Show password');
  event.currentTarget.setAttribute('aria-pressed',String(show));
};
