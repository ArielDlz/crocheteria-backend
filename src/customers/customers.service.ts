import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
  ) {}

  async create(createDto: CreateCustomerDto): Promise<CustomerDocument> {
    const customer = new this.customerModel(createDto);
    return customer.save();
  }

  // Obtener solo clientes activos
  async findAll(): Promise<CustomerDocument[]> {
    return this.customerModel
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Obtener todos los clientes (incluyendo inactivos)
  async findAllIncludingInactive(): Promise<CustomerDocument[]> {
    return this.customerModel.find().sort({ createdAt: -1 }).exec();
  }

  // Obtener solo clientes inactivos
  async findInactive(): Promise<CustomerDocument[]> {
    return this.customerModel
      .find({ isActive: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<CustomerDocument | null> {
    return this.customerModel.findById(id).exec();
  }

  async update(
    id: string,
    updateDto: UpdateCustomerDto,
  ): Promise<CustomerDocument> {
    const customer = await this.customerModel.findById(id).exec();

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // Filtrar valores undefined y null para actualización parcial
    const cleanedUpdate = Object.fromEntries(
      Object.entries(updateDto).filter(
        ([_, value]) => value !== undefined && value !== null,
      ),
    );

    Object.assign(customer, cleanedUpdate);
    return customer.save();
  }

  // Borrado lógico - desactivar cliente
  async deactivate(id: string): Promise<CustomerDocument> {
    const customer = await this.customerModel.findById(id).exec();

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    customer.isActive = false;
    return customer.save();
  }

  // Reactivar cliente
  async reactivate(id: string): Promise<CustomerDocument> {
    const customer = await this.customerModel.findById(id).exec();

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    customer.isActive = true;
    return customer.save();
  }

  // Borrado físico permanente
  async deletePermanently(id: string): Promise<void> {
    const result = await this.customerModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Cliente no encontrado');
    }
  }
}
