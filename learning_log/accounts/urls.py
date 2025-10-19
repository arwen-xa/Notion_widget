"""为应用程序 accounts 定义 URL 模式""" 
 
from django.urls import path, include 
# 包含include函数，一边包含 Django 定义的一些默认的身份验证 URL ，其中包含具名的 URL 模式，如 'login' 和 'logout'。

from . import views

# 将变量 app_name 设置成'accounts'，让 Django 能够将这些 URL 与其他应用程序的 URL区分开来。
# 即便是 Django 提供的默认 URL，将其写入应用程序accounts 的文件后，也可通过命名空间 accounts 进行访问
# 登录页面的 URL 模式与 URL http://localhost:8000/accounts/login/ 匹配。
# 这个 URL 中的单词accounts 让 Django 在 accounts/urls.py 中查找，而单词 login则让它将请求发送给 Django 的默认视图 login。
app_name = 'accounts'
urlpatterns = [ 
    # 包含默认的身份验证 URL 
    path('', include('django.contrib.auth.urls')), 

    # 注册页面
    # 注册页面的 URL 模式与 URL http://localhost:8000/accounts/register/ 匹配，并将请求发送给即将编写的 register() 函数。
    path('register/', views.register, name='register'),
]