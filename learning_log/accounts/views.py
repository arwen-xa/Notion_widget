from django.shortcuts import render, redirect
from django.contrib.auth import login 
from django.contrib.auth.forms import UserCreationForm

# Create your views here.
def register(request): 
    """注册新用户""" 
    if request.method != 'POST': 
        # 显示空的注册表单 
        form = UserCreationForm() 
    else: 
        # 处理填写好的表单 
        form = UserCreationForm(data=request.POST) 

        # 这里的有效是指，用户名未包含非法字符，输入的两个密码相同，以及用户没有试图做恶意的事情。
        if form.is_valid(): 
            # save() 方法，将用户名和密码的哈希值保存到数据库中
            # save() 方法返回新创建的用户对象，我们将它赋给 new_user。
            new_user = form.save() 
            # 让用户自动登录，再重定向到主页 
            # 调用 login() 函数并传入对象 request和 new_user，为用户创建有效的会话，从而让其自动登录。
            login(request, new_user) 
            return redirect('learning_logs:index') 
        
    # 显示空表单或指出表单无效 
    context = {'form': form} 
    return render(request, 'registration/register.html', context)