"""定义learning_logs的url模式"""

# 函数 path，使用它将URL 映射到视图
from django.urls import path

# 导入 views 模块，其中的句点让 Python 从当前 urls.py 模块所在的文件夹中导入 views。
from . import views

# 变量 app_name 让 Django 能够将这个 urls.py 文件与项目内其他应用程序中的同名文件区分开来
app_name = 'learning_logs'

# urlpatterns 是一个列表，包含可在应用程序 learning_logs中请求的网页。
# 实际的 URL 模式是对 path() 函数的调用，这个函数接受三个实参:
#   第一个实参是一个字符串，帮助 Django 正确地路由（route）请求。
#   收到请求的 URL 后，Django 力图将请求路由给一个视图，并为此搜索所有的 URL 模式，以找到与当前请求匹配的。
#   Django 忽略项目的基础 URL（http://localhost:8000/），因此空字符串（''）与基础 URL 匹配。
#   其他 URL 都与这个模式不匹配。
#   如果请求的 URL与任何既有的 URL 模式都不匹配，Django 将返回一个错误页面。
#   第二个实参指定了要调用 view.py 中的哪个函数。
#   当请求的 URL 与前述正则表达式匹配时，Django 将调用view.py 中的 index() 函数（这个视图函数将在 18.3.2 节编写）。
#   第三个实参将这个 URL 模式的名称指定为 index，让我们能够在其他项目文件中轻松地引用它。
#   每当需要提供这个主页的链接时，都将使用这个名称，而不编写 URL。
urlpatterns = [
    # 主页
    path('', views.index, name='index'),

    # 显示所有主题的页面
    # 新的 URL 模式为 topics/。
    # 在 Django 检查请求的 URL 时，这个模式将与如下 URL 匹配：基础 URL 后面跟着 topics。
    # 既可在末尾包含斜杠，也可省略，但单词 topics 后面不能有其他任何东西，否则就会与该模式不匹配。
    # URL 与该模式匹配的请求都将交给 views.py 中的 topics() 函数进行处理。
    path('topics/', views.topics, name='topics'),

    # 特定主题的详细页面
    # 'topics/<int:topic_id>/'中，
    # 第一部分（topics）让 Django 查找在基础 URL 后紧跟单词 topics 的URL，
    # 第二部分（/<int:topic_id>/）与在两个斜杠之间的整数匹配，并将这个整数赋给实参 topic_id
    # 当发现 URL 与这个模式匹配时，Django 将调用视图函数topic()，并将 topic_id 的值作为实参传递给它。
    # 在topic()这个函数中，将使用 topic_id 的值来获取相应的主题
    path('topics/<int:topic_id>/', views.topic, name='topic'),

    # 用于添加新主题的网页
    path('new_topic/', views.new_topic, name='new_topic'),

    # 用于添加新条目的页面
    # 这个 URL 模式与形如 http://localhost:8000/new_entry/id/的 URL 匹配，其中的 id 是一个与主题 ID 匹配的数。
    # 代码<int:topic_id> 捕获一个数值，并将其赋给变量topic_id。
    # 当请求的 URL 与这个模式匹配时，Django 会将请求和主题 ID 发送给函数 new_entry()。
    path('new_entry/<int:topic_id>/', views.new_entry, name='new_entry'),

    # 用于编辑条目的页面
    path('edit_entry/<int:entry_id>/', views.edit_entry, name='edit_entry'),
]