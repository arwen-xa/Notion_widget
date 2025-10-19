from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import Http404 

from .models import Topic, Entry
from .forms import TopicForm, EntryForm

# Create your views here.

# 当 URL 请求与刚才定义的模式匹配时，Django 将在文件 views.py中查找 index() 函数，再将对象 request 传递给这个视图函数。
def index(request):
    """学习笔记的主页"""
    # 这里不需要处理数据，只包含render
    # 向 render() 函数提供了两个实参：对象 request 和一个可用于创建网页的模板。模板是自己创建的
    return render(request, 'learning_logs/index.html')

# login_required() 的代码检查用户是否已登录。
# 仅当用户已登录时，Django 才运行 topics() 的代码。
# 如果用户未登录，就重定向到登录页面。需修改settings实现
@login_required
def topics(request):
    """显示所有主题"""
    # 查询数据库：请求提供 Topic 对象，并根据属性 date_added 进行排序
    # 用户登录后，request 对象将有一个 request.user 属性集，其中包含有关该用户的信息。
    # 查询Topic.objects.filter(owner=request.user) 让 Django 只从数据库中获取 owner 属性为当前用户的 Topic 对象。
    # 由于没有修改主题的显示方式，因此无须对页面 topics 的模板做任何修改。
    topics = Topic.objects.filter(owner=request.user).order_by('date_added')
    
    # 定义一个将发送给模板的上下文
    # 上下文（context）是一个字典，其中的键是将用来在模板中访问数据的名称，而值是要发送给模板的数据。
    context = {'topics': topics}

    # 在创建使用数据的网页时，调用了render()，并向它传递对象 request、要使用的模板和字典context
    return render(request, 'learning_logs/topics.html', context)

@login_required
def topic(request, topic_id):
    """显示单个主题及其所有的条目"""
    # 除了 request 对象外，还包含另一个形参,接受表达式 /<int:topic_id>/ 捕获的值
    topic = Topic.objects.get(id=topic_id) # 使用 get() 来获取指的主题

    # 确认请求的主题属于当前用户
    # 当服务器上没有被请求的资源时，标准的做法是返回 404 响应。
    # 这里导入异常 Http404（见❶），并在用户请求无权访问的主题时引发这个异常。
    if topic.owner != request.user:
        raise Http404
    
    entries = topic.entry_set.order_by('-date_added') # date_added 前面的减号指定按降序排列，即先显示最近的条目。
    context = {'topic': topic, 'entries': entries}
    return render(request, 'learning_logs/topic.html', context)

@login_required
def new_topic(request):
    """添加新主题"""
    # 函数 new_topic() 将请求对象作为参数。
    # 在用户初次请求该网页时，浏览器将发送 GET 请求；
    # 在用户填写并提交表单时，浏览器将发送 POST 请求。
    # 根据请求的类型，可确定用户请求的是空表单（GET 请求）还是要求对填写好的表单进行处理（POST 请求）。
    if request.method != 'POST':
        # 不是post，那么就是get或其他请求，则返回一个空表单
        # 由于在实例化 TopicForm 时没有指定任何实参，Django 将创建一个空表单，供用户填写。
        # 未提交数据：创建一个新表单
        form = TopicForm()
    else:
        # 请求方法为post时，执行以下代码
        # 用户输入的数据被赋给了request.POST，用其创建topicform实例
        # POST提交的数据：对数据进行处理
        form = TopicForm(data=request.POST)
        # 方法 is_valid() 核实用户填写了所有必不可少的字段（表单字段默认都是必不可少的），
        # 而且输入的数据与要求的字段类型一致
        if form.is_valid():
            # save()将表单中的数据写入数据库。
            # form.save()
            # 新建topic时指定owner
            new_topic = form.save(commit=False)
            new_topic.owner = request.user
            new_topic.save()

            # 使用 redirect()将用户的浏览器重定向到页面 topics，看到新建的主题
            # redirect() 将一个视图作为参数，并将用户重定向到与该视图相关联的网页。
            return redirect('learning_logs:topics')
    
    # 显示空表单或指出表单数据无效
    context = {'form': form}
    return render(request, 'learning_logs/new_topic.html', context)

@login_required
def new_entry(request, topic_id): 
    """在特定主题中添加新条目""" 
    # new_entry() 的定义包含形参 topic_id，用于存储从 URL中获得的值。
    # 使用 topic_id 来获得正确的主题
    topic = Topic.objects.get(id=topic_id)
    if request.method != 'POST': 
        # 未提交数据：创建一个空表单
        form = EntryForm() 
    else:
        # POST 提交的数据：对数据进行处理
        form = EntryForm(data=request.POST) 
        if form.is_valid(): 
            # 在调用 save() 时，传递实参 commit=False，让Django 创建一个新的条目对象，
            # 并将其赋给 new_entry，但不保存到数据库中。
            new_entry = form.save(commit=False)
            # 将 new_entry 的属性 topic 设置为在这个函数开头从数据库中获取的主题
            new_entry.topic = topic
            # 再调用 save() 且不指定任何实参。这将把条目保存到数据库中，并将其与正确的主题相关联。
            new_entry.save()
            # redirect() 要求提供两个参数：要重定向到的视图，以及要给视图函数提供的参数
            # 这里重定向到 topic()，而这个视图函数需要参数 topic_id。
            return redirect('learning_logs:topic', topic_id=topic_id)
    
    # 显示空表单或指出表单数据无效
    context = {'topic': topic, 'form': form}
    return render(request, 'learning_logs/new_entry.html', context)

@login_required
def edit_entry(request, entry_id): 
    """编辑既有的条目"""
    # 获取用户要修改的条目对象以及与其相关联的主题。
    entry = Entry.objects.get(id=entry_id)
    topic = entry.topic
    # 检查当前登录用户是否topic owner
    if topic.owner != request.user: 
        raise Http404

    if request.method != 'POST': 
        # 初次请求：使用当前的条目填充表单
        # 在当请求方法为 GET 时将执行的if 代码块中，使用实参 instance=entry 创建一个EntryForm 实例
        # 这个实参让 Django 创建一个表单，并使用既有条目对象中的信息填充它。
        form = EntryForm(instance=entry)
    else:
        # POST 提交的数据：对数据进行处理
        # 在处理 POST 请求时，传递实参 instance=entry 和data=request.POST
        # ，让 Django 根据既有条目对象创建一个表单实例，并根据 request.POST 中的相关数据对其进行修改。
        form = EntryForm(instance=entry, data=request.POST)
        if form.is_valid():
            form.save() 
            # 重定向到显示条目所属主题的页面，用户将在其中看到自己编辑的条目的新版本。
            return redirect('learning_logs:topic', topic_id=topic.id)
    
    # 如果要显示表单来让用户编辑条目或者用户提交的表单无效，就创建上下文字典并使用模板 edit_entry.html 渲染网页。
    context = {'entry': entry, 'topic': topic, 'form': form}
    return render(request, 'learning_logs/edit_entry.html', context)